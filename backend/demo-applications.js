// Fixed fictional records; submitted data never enters this collection.
module.exports = Object.freeze([
  { id: 1, name: 'Демо Анна', contact: 'anna@example.invalid', level: 'с нуля', goal: 'поездки', difficulty: 'боюсь говорить', preferred_time: 'вечером', status: 'new', created_at: '2026-01-10T09:00:00.000Z', demo_consent: 1 },
  { id: 2, name: 'Демо Борис', contact: 'boris@example.invalid', level: 'немного знаю', goal: 'работа', difficulty: 'не понимаю грамматику', preferred_time: 'утром', status: 'contact', created_at: '2026-01-11T09:00:00.000Z', demo_consent: 1 },
  { id: 3, name: 'Демо Вера', contact: 'vera@example.invalid', level: 'хочу повторить', goal: 'общение', difficulty: 'забываю слова', preferred_time: 'днём', status: 'done', created_at: '2026-01-12T09:00:00.000Z', demo_consent: 1 },
  { id: 4, name: 'Демо Глеб', contact: 'gleb@example.invalid', level: 'с нуля', goal: 'для себя', difficulty: 'не знаю, с чего начать', preferred_time: 'в выходные', status: 'new', created_at: '2026-01-13T09:00:00.000Z', demo_consent: 1 },
  { id: 5, name: 'Демо Дарья', contact: 'daria@example.invalid', level: 'немного знаю', goal: 'другое', difficulty: 'не понимаю на слух', preferred_time: 'другое', status: 'contact', created_at: '2026-01-14T09:00:00.000Z', demo_consent: 1 },
].map(Object.freeze));
