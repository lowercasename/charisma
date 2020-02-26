const express = require('express')
const app = express()
const port = 1974
const cors = require('cors')

const { check, validationResult } = require('express-validator')

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const honeypotAdapter = new FileSync('honeypot.json')
const db = low(adapter)
const honeypot = low(honeypotAdapter)
const nanoid = require('nanoid')

const jdenticon = require("jdenticon")
const marked = require("marked")

db.defaults({ comments: [] })
  .write()

honeypot.defaults({ comments: [] })
  .write()

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function slugify(str, separator) {
  str = str.trim();
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaaaeeeeiiiioooouuuunc------";

  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  return str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-") // collapse dashes
    .replace(/^-+/, "") // trim - from start of text
    .replace(/-+$/, "") // trim - from end of text
    .replace(/-/g, separator);
}

// GET method route
app.get('/', function (req, res) {
  res.send('Shhh.')
})

app.post('/create', [
  check('name').isLength({ min: 3, max: 200 }).trim().escape(),
  check('content').isLength({ min: 3 }).trim().escape()
], (req, res) => {
  console.log("Adding comment.")
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation error!")
    return res.status(200).json({ errors: errors.array() });
  }
  const { name, content, slug } = req.body
  const parsedContent = marked(content)
  const date = Date.now()
  const id = nanoid()

  const avatarSize = 60
  const avatarSvg = jdenticon.toSvg(name, avatarSize);

  if (req.body.password) {
    honeypot.get('comments')
      .push({
        id: id,
        date: date,
        slug: slug,
        name: name,
        content: parsedContent,
        avatar: avatarSvg
      })
      .write()
    res.status(500).send({
      status: 'honeypot'
    })
  } else {
    if (name && content) {
      db.get('comments')
        .push({
          id: id,
          date: date,
          slug: slug,
          name: name,
          content: parsedContent,
          avatar: avatarSvg
        })
        .write()
      res.status(201).send({
        status: 'ok',
        id: id,
        date: date,
        slug: slug,
        name: name,
        content: parsedContent,
        avatar: avatarSvg
      })
    }
  }
})

app.get('/fetch/:slug', (req, res) => {
  console.log("Fetching comments.")
  const slug = req.params.slug
  const comments = db.get('comments')
    .chain()
    .filter({ slug: slug })
    .value()
  if (comments) {
    res.status(200).send({
      status: 'ok',
      comments: comments
    })
  }
})


app.listen(port, () => console.log(`Charisma commenting system listening on port ${port}!`))