// queries/part3_aggregations.js

const db = db.getSiblingDB("spotify");

// Завдання 1. Топ-10 виконавців за середньою популярністю (>= 5 треків)

print("\nЧастина 3, Завдання 1: топ-10 виконавців за середньою популярністю\n");
printjson(
  db.tracks.aggregate([
    { $unwind: "$artists" },
    {
      $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        avg_popularity: { $avg: "$popularity" }
      }
    },
    { $match: { track_count: { $gte: 5 } } },
    {
      $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        avg_popularity: { $round: ["$avg_popularity", 1] }
      }
    },
    { $sort: { avg_popularity: -1 } },
    { $limit: 10 }
  ]).toArray()
);

// Завдання 2. Розподіл треків за настроєм (valence + energy, поріг 0.5)
//   high valence + high energy -> happy
//   low  valence + high energy -> angry
//   high valence + low  energy -> calm
//   low  valence + low  energy -> sad

print("\nЧастина 3, Завдання 2: розподіл треків за настроєм\n");
printjson(
  db.tracks.aggregate([
    {
      $addFields: {
        mood: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $gte: ["$audio_features.valence", 0.5] },
                    { $gte: ["$audio_features.energy", 0.5] }
                  ]
                },
                then: "happy"
              },
              {
                case: {
                  $and: [
                    { $lt: ["$audio_features.valence", 0.5] },
                    { $gte: ["$audio_features.energy", 0.5] }
                  ]
                },
                then: "angry"
              },
              {
                case: {
                  $and: [
                    { $gte: ["$audio_features.valence", 0.5] },
                    { $lt: ["$audio_features.energy", 0.5] }
                  ]
                },
                then: "calm"
              }
            ],
            default: "sad" // low valence + low energy
          }
        }
      }
    },
    { $group: { _id: "$mood", count: { $sum: 1 } } },
    { $project: { _id: 0, mood: "$_id", count: 1 } },
    { $sort: { count: -1 } }
  ]).toArray()
);

// Завдання 3. Найбільш "танцювальний" жанр (>= 100 треків)

print("\nЧастина 3, Завдання 3: найбільш танцювальний жанр\n");
printjson(
  db.tracks.aggregate([
    {
      $group: {
        _id: "$track_genre",
        avg_danceability: { $avg: "$audio_features.danceability" },
        avg_energy: { $avg: "$audio_features.energy" },
        avg_valence: { $avg: "$audio_features.valence" },
        track_count: { $sum: 1 }
      }
    },
    { $match: { track_count: { $gte: 100 } } },
    {
      $project: {
        _id: 0,
        genre: "$_id",
        avg_danceability: { $round: ["$avg_danceability", 3] },
        avg_energy: { $round: ["$avg_energy", 3] },
        avg_valence: { $round: ["$avg_valence", 3] },
        track_count: 1
      }
    },
    { $sort: { avg_danceability: -1 } },
    { $limit: 10 }
  ]).toArray()
);
