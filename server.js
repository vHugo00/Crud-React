const express = require('express');
const bodyParser = require('body-parser');
const Datastore = require('nedb');
const cors = require('cors');

const app = express();
const port = 5000;

const db = new Datastore({ filename: 'contacts.db', autoload: true });

app.use(cors());
app.use(bodyParser.json());

// Criar
app.post('/contacts', (req, res) => {
  const contact = req.body;
  db.insert(contact, (err, newContact) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(newContact);
    }
  });
});

// Ler
app.get('/contacts', (req, res) => {
  db.find({}, (err, contacts) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(contacts);
    }
  });
});

// Atualizar
app.put('/contacts/:id', (req, res) => {
  const id = req.params.id;
  const updatedContact = req.body;
  db.update({ _id: id }, updatedContact, {}, (err, numReplaced) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.sendStatus(200);
    }
  });
});

// Deletar
app.delete('/contacts/:id', (req, res) => {
  const id = req.params.id;
  db.remove({ _id: id }, {}, (err, numRemoved) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.sendStatus(200);
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
