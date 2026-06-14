// scripts/02_transform.js
// Трансформація плоскої колекції tracks_raw у документоорієнтовану tracks.
// Запуск: mongosh "ВАШ_URI" --file scripts/02_transform.js

const db = db.getSiblingDB("spotify");

// 1. Перед трансформацією видаляємо стару колекцію tracks (ідемпотентність)
db.tracks.drop();

db.tracks_raw.aggregate([
  // 2. Проєкція потрібних полів. Рядок із виконавцями зберігаємо тимчасово як artists_raw,
  //    аудіофічі тимчасово лишаємо плоско — нижче вкладемо їх в об'єкт.
  {
    $project: {
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists_raw: "$artists",
      danceability: 1,
      energy: 1,
      loudness: 1,
      speechiness: 1,
      acousticness: 1,
      instrumentalness: 1,
      liveness: 1,
      valence: 1,
      tempo: 1,
      key: 1,
      mode: 1,
      time_signature: 1
    }
  },

  // 3. Розбиваємо рядок артистів по ";" та прибираємо пробіли -> масив artists.
  // 4. Формуємо вкладений audio_features та обчислювані поля.
  {
    $addFields: {
      artists: {
        $map: {
          input: { $split: ["$artists_raw", ";"] },
          as: "a",
          in: { $trim: { input: "$$a" } }
        }
      },
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature"
      },
      duration_sec: { $round: [{ $divide: ["$duration_ms", 1000] }, 1] },
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $gte: ["$popularity", 40] }, then: "medium" }
          ],
          default: "low"
        }
      }
    }
  },

  // 5. Прибираємо вихідні (плоскі) аудіофічі та artists_raw.
  {
    $project: {
      danceability: 0,
      energy: 0,
      loudness: 0,
      speechiness: 0,
      acousticness: 0,
      instrumentalness: 0,
      liveness: 0,
      valence: 0,
      tempo: 0,
      key: 0,
      mode: 0,
      time_signature: 0,
      artists_raw: 0
    }
  },

  // 6. Зберігаємо результат у колекцію tracks (замінює вміст повністю).
  { $out: "tracks" }
]);

// 7. Перевірка результату
print("Документів у tracks: " + db.tracks.countDocuments({}));
print("Приклад документа:");
printjson(db.tracks.findOne());
