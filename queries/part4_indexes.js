// queries/part4_indexes.js

// Скрипт виводить план виконання ДО та ПІСЛЯ створення індексів.
// Ключові поля для README: stage (COLLSCAN vs IXSCAN), totalDocsExamined,
// totalKeysExamined, nReturned, executionTimeMillis, наявність SORT-стадії.

const db = db.getSiblingDB("spotify");

function stats(cursor) {
  // Повертає лише executionStats для компактного логу
  return cursor.explain("executionStats").executionStats;
}

// Завдання 1. Аналіз запиту + складений індекс (правило ESR)
// Запит: equality(track_genre) + range(danceability) + sort(popularity desc)

print("\nЗАВДАННЯ 1\n");

// Скидаємо індекс, якщо лишився з попереднього запуску (для чистого "до")
try { db.tracks.dropIndex("genre_pop_dance"); } catch (e) {}

print("\n1) explain ДО індексу");
printjson(
  stats(
    db.tracks
      .find({
        track_genre: "pop",
        "audio_features.danceability": { $gte: 0.7 }
      })
      .sort({ popularity: -1 })
  )
);

// Правило ESR: Equality -> Sort -> Range
print("\n2) Створюємо індекс { track_genre:1, popularity:-1, audio_features.danceability:1 }");
db.tracks.createIndex(
  { track_genre: 1, popularity: -1, "audio_features.danceability": 1 },
  { name: "genre_pop_dance" }
);

print("\n3) explain ПІСЛЯ індексу");
printjson(
  stats(
    db.tracks
      .find({
        track_genre: "pop",
        "audio_features.danceability": { $gte: 0.7 }
      })
      .sort({ popularity: -1 })
  )
);

// Завдання 2. Складений індекс для "музики для роботи"
// поля: audio_features.instrumentalness, audio_features.speechiness, explicit

print("\nЗАВДАННЯ 2\n");

try { db.tracks.dropIndex("work_music_idx"); } catch (e) {}

// ESR: рівність (explicit) ставимо першою, далі діапазонні поля
db.tracks.createIndex(
  {
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
  },
  { name: "work_music_idx" }
);

print("\nexplain з індексом work_music_idx");
printjson(
  stats(
    db.tracks.find({
      explicit: false,
      "audio_features.instrumentalness": { $gt: 0.5 },
      "audio_features.speechiness": { $lt: 0.1 }
    })
  )
);

// Завдання 3. Покривний запит — демонстрація
// Індекс { track_genre:1, popularity:-1, audio_features.danceability:1 } існує.
// Запит без проєкції -> НЕ покривний (повертає всі поля + _id, є FETCH).
// Запит з проєкцією лише по індексних полях і _id:0 -> покривний (totalDocsExamined = 0).

print("\nЗАВДАННЯ 3\n");

print("\nБез проєкції (НЕ покривний: очікуємо FETCH, totalDocsExamined > 0)");
printjson(
  stats(
    db.tracks.find({ track_genre: "pop", popularity: { $gte: 70 } })
  )
);

print("\nЗ проєкцією по індексних полях, _id:0 (покривний: totalDocsExamined = 0)");
printjson(
  stats(
    db.tracks.find(
      { track_genre: "pop", popularity: { $gte: 70 } },
      { _id: 0, track_genre: 1, popularity: 1 }
    )
  )
);
