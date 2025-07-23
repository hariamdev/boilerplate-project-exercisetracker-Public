const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config()

app.use(cors())
app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use(express.static('public'))

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Mongo connected'))
  .catch(console.error);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const exerciseSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description:{ type: String, required: true },
  duration:   { type: Number, required: true },
  date:       { type: Date, required: true }
});
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res, next) => {
  try {
    const user = await User.create({ username: req.body.username });
    res.json({ username: user.username, _id: user._id });
  } catch (e) { next(e); }
});

app.get('/api/users', async (_req, res, next) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (e) { next(e); }
});

app.post('/api/users/:_id/exercises', async (req, res, next) => {
  try {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = await Exercise.create({
      userId: user._id,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date()
    });

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (e) { next(e); }
});

app.get('/api/users/:_id/logs', async (req, res, next) => {
  try {
    const { from, to, limit } = req.query;
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // build filter
    const filter = { userId: user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select('description duration date');
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
