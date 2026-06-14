// queries/part2_queries.js

const db = db.getSiblingDB("spotify");

// Завдання 1. Треки для вечірки
// danceability > 0.7, energy > 0.7, тривалість 180000–300000 мс (3–5 хв)

print("\nЗавдання 1: треки для вечірки\n");
printjson(
  db.tracks.find(
    {
      "audio_features.danceability": { $gt: 0.7 },
      "audio_features.energy": { $gt: 0.7 },
      duration_ms: { $gte: 180000, $lte: 300000 }
    },
    { _id: 0, track_name: 1, artists: 1, popularity: 1, duration_sec: 1 }
  )
    .sort({ popularity: -1 })
    .limit(20)
    .toArray()
);

// Завдання 2. Виконавці, у яких УСІ треки популярні
// >= 3 треки і мінімальна популярність >= 60. Топ-20 за середньою популярністю.

print("\nЗавдання 2: артисти, у яких усі треки популярні\n");
printjson(
  db.tracks.aggregate([
    { $unwind: "$artists" },
    {
      $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        min_popularity: { $min: "$popularity" },
        avg_popularity: { $avg: "$popularity" }
      }
    },
    // "усі треки популярні" => найменш популярний теж >= 60
    { $match: { track_count: { $gte: 3 }, min_popularity: { $gte: 60 } } },
    {
      $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        min_popularity: 1,
        avg_popularity: { $round: ["$avg_popularity", 1] }
      }
    },
    { $sort: { avg_popularity: -1 } },
    { $limit: 20 }
  ]).toArray()
);

// Завдання 3. Нетипові треки (незвично високий темп для жанру)
// поріг = mean(tempo жанру) + 2 * stdDevPop(tempo жанру); вибрати tempo > поріг

print("\nЗавдання 3: нетипові треки за темпом\n");
printjson(
  db.tracks.aggregate([
    {
      $group: {
        _id: "$track_genre",
        avg_tempo: { $avg: "$audio_features.tempo" },
        std_tempo: { $stdDevPop: "$audio_features.tempo" },
        tracks: {
          $push: {
            _id: "$_id",
            track_name: "$track_name",
            popularity: "$popularity",
            artists: "$artists",
            audio_features: { tempo: "$audio_features.tempo" }
          }
        }
      }
    },
    // поріг для викидів
    {
      $addFields: {
        outlier_threshold: {
          $add: ["$avg_tempo", { $multiply: [2, "$std_tempo"] }]
        }
      }
    },
    // лишаємо лише треки, що перевищують поріг (порівняння на НЕокругленому порозі)
    {
      $addFields: {
        outlier_tracks: {
          $filter: {
            input: "$tracks",
            as: "t",
            cond: { $gt: ["$$t.audio_features.tempo", "$outlier_threshold"] }
          }
        }
      }
    },
    // викидаємо жанри, де викидів немає
    { $match: { "outlier_tracks.0": { $exists: true } } },
    {
      $project: {
        _id: 0,
        genre: "$_id",
        avg_tempo: { $round: ["$avg_tempo", 0] },
        outlier_threshold: { $round: ["$outlier_threshold", 1] },
        outlier_tracks: 1
      }
    },
    { $sort: { genre: 1 } }
  ]).toArray()
);

// Завдання 4. Треки для фонової роботи
// loudness < -10, speechiness < 0.1, instrumentalness > 0.5, не explicit

print("\nЗавдання 4: треки для фонової роботи\n");
printjson(
  db.tracks.find(
    {
      "audio_features.loudness": { $lt: -10 },
      "audio_features.speechiness": { $lt: 0.1 },
      "audio_features.instrumentalness": { $gt: 0.5 },
      explicit: false
    },
    { _id: 0, track_name: 1, artists: 1, track_genre: 1, popularity: 1 }
  )
    .sort({ popularity: -1 })
    .limit(20)
    .toArray()
);
