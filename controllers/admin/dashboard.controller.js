const Project = require("../../models/project");

const Task = require("../../models/task");
const User = require("../../models/user");

exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6); // 7 derniers jours

    // Étape 1 : Agrégation des tâches journalières par date
    const rawDaily = await Task.aggregate([
      {
        $match: {
          type: "daily",
          createdAt: {
            $gte: startDate,
            $lte: today,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          pourcentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $round: [
                  { $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
                  0,
                ],
              },
            ],
          },
          nombre: {
            $concat: [
              { $toString: "$completed" },
              "/",
              { $toString: "$total" },
            ],
          },
        },
      },
    ]);

    // Étape 2 : Ajouter les jours manquants (jours sans tâche)
    const getLastNDays = (n) => {
      const dates = [];
      const today = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      return dates;
    };

    const last7Days = getLastNDays(7);
    const mapRaw = Object.fromEntries(rawDaily.map((d) => [d.date, d]));

    const dailyProgression = last7Days.map((date) => {
      return (
        mapRaw[date] || {
          date,
          pourcentage: 0,
          nombre: "0/0",
        }
      );
    });

    // 1. Statistiques globales (projets et tâches)
    const [
      activeProjects,
      inactiveProjects,
      completedProjects,
      totalTasks,
      tasksStats,
      recentActivities,
    ] = await Promise.all([
      Project.countDocuments({ status: "active" }),
      Project.countDocuments({ status: "inactive" }),
      Project.countDocuments({ status: "completed" }),
      Task.countDocuments(), // Total de toutes les tâches
      Task.aggregate([
        {
          $facet: {
            taskTypes: [
              {
                $group: {
                  _id: "$type",
                  total: { $sum: 1 },
                  completed: {
                    $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                  },
                  inProgress: {
                    $sum: { $cond: [{ $eq: ["$status", "inProgress"] }, 1, 0] },
                  },
                  late: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $ne: ["$status", "completed"] },
                            { $lt: ["$deadline", new Date()] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            progressionStats: [
              {
                $group: {
                  _id: null,
                  avgProgression: { $avg: "$progress" },
                  minProgression: { $min: "$progress" },
                  maxProgression: { $max: "$progress" },
                },
              },
            ],
          },
        },
      ]),
      Task.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("project", "name logo")
        .populate("assignedTo", "name profilePhoto"),
    ]);

    // ✅ Sécuriser l'accès à taskTypes et progressionStats
    const taskTypes = tasksStats[0]?.taskTypes || [];
    const progressionStats = tasksStats[0]?.progressionStats || [];

    // 2. Formatage des données
    const formattedTasksStats = taskTypes.map((type) => ({
      type: type._id,
      ...type,
    }));

    const progressionData = progressionStats[0] || {
      avgProgression: 0,
      minProgression: 0,
      maxProgression: 0,
    };

    // 3. Tâches critiques (en retard)
    const criticalTasks = await Task.find({
      deadline: { $lt: new Date() },
      status: { $ne: "completed" },
    })
      .sort({ deadline: 1 })
      .limit(5)
      .populate("project", "name priority")
      .populate("assignedTo", "name");

    // 4. Calcul de la progression globale
    const projects = await Project.find().select("progression");
    const overallProgression =
      projects.length > 0
        ? Math.round(
            projects.reduce((sum, p) => sum + p.progression, 0) /
              projects.length
          )
        : 0;

    // ✅ Envoi de la réponse JSON
    res.json({
      projects: {
        active: activeProjects,
        inactive: inactiveProjects,
        completed: completedProjects,
        total: activeProjects + inactiveProjects + completedProjects,
        overallProgression
      },
      tasks: {
        stats: formattedTasksStats,
        progression: progressionData,
        total: totalTasks,
        dailyProgression
        
      },
      activities: {
        recent: recentActivities,
        critical: criticalTasks
      },
      
      
    });
  } catch (err) {
    console.error("[Dashboard Controller] Error:", err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};