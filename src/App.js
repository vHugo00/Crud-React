import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Snackbar, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { object, string } from 'zod';
import InputMask from 'react-input-mask';
import { motion } from 'framer-motion';

const contactSchema = object({
  name: string()
    .nonempty('O nome é obrigatório')
    .transform(name => {
      return name.trim().split(' ').map(word => {
        return word[0].toLocaleUpperCase().concat(word.substring(1));
      }).join(' ');
    }),
  email: string().email({ message: 'Endereço de email inválido' }),
  phone: string().min(1, { message: 'Digite seu número de telefone' }),
});

function FeedbackMessage({ message, onClose }) {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={!!message}
      autoHideDuration={3000}
      onClose={onClose}
      message={message}
    />
  );
}

function ContactItem({ contact, onDelete, onEdit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Paper elevation={3} style={{ marginBottom: '1rem' }}>
        <ListItem alignItems="flex-start">
          <ListItemText
            primary={<Typography variant="h6">{contact.name}</Typography>}
            secondary={
              <React.Fragment>
                <Typography variant="subtitle1">Email: {contact.email}</Typography>
                <Typography variant="subtitle1">Telefone: {contact.phone}</Typography>
                <Typography variant="subtitle1">Mensagem: {contact.message}</Typography>
              </React.Fragment>
            }
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" aria-label="edit" onClick={() => onEdit(contact)}>
              <EditIcon />
            </IconButton>
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(contact._id, contact.name)}>
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      </Paper>
    </motion.div>
  );
}

function App() {
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', message: '' });
  const [editingContact, setEditingContact] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const response = await axios.get('http://localhost:5000/contacts');
    setContacts(response.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      contactSchema.parse(newContact);
      const cleanedPhone = newContact.phone.replace(/\D/g, '');
      if (!cleanedPhone.match(/^\d+$/)) {
        throw new Error('O telefone deve conter apenas números');
      }
      if (editingContact) {
        await axios.put(`http://localhost:5000/contacts/${editingContact._id}`, newContact);
        showMessage('Contato atualizado com sucesso');
        setEditingContact(null);
      } else {
        await axios.post('http://localhost:5000/contacts', newContact);
        showMessage('Contato adicionado com sucesso');
      }
      setNewContact({ name: '', email: '', phone: '', message: '' });
      setErrors({});
      fetchContacts();
    } catch (error) {
      if (error instanceof Error && error.errors) {
        const validationErrors = {};
        error.errors.forEach((err) => {
          validationErrors[err.path.join('.')] = err.message;
        });
        setErrors(validationErrors);
      } else {
        setErrors({ phone: error.message });
      }
    }
  };

  const handleEdit = (contact) => {
    setNewContact(contact);
    setEditingContact(contact);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir ${name}?`)) {
      await axios.delete(`http://localhost:5000/contacts/${id}`);
      showMessage('Contato excluído com sucesso');
      fetchContacts();
    }
  };

  const handleFieldBlur = (field) => {
    try {
      contactSchema.pick({ [field]: true }).parse({ [field]: newContact[field] });
      setErrors(prevErrors => ({ ...prevErrors, [field]: '' }));
    } catch (error) {
      if (error instanceof Error && error.errors) {
        const validationError = error.errors[0];
        setErrors(prevErrors => ({ ...prevErrors, [field]: validationError.message }));
      }
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h3" align="center" gutterBottom>Team Contacts</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Nome"
          variant="outlined"
          fullWidth
          margin="normal"
          value={newContact.name}
          onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
          error={!!errors['name']}
          helperText={errors['name']}
        />
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          margin="normal"
          value={newContact.email}
          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
          error={!!errors['email']}
          helperText={errors['email']}
          onBlur={() => handleFieldBlur('email')}
        />
        <InputMask
          mask="(99) 9 9999-9999"
          value={newContact.phone}
          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
          onBlur={() => handleFieldBlur('phone')}
        >
          {() => <TextField
            label="Telefone"
            variant="outlined"
            fullWidth
            margin="normal"
            error={!!errors['phone']}
            helperText={errors['phone']}
          />}
        </InputMask>
        <TextField
          label="Mensagem"
          variant="outlined"
          fullWidth
          margin="normal"
          value={newContact.message}
          onChange={(e) => setNewContact({ ...newContact, message: e.target.value })}
        />
        <Button variant="contained" color="primary" type="submit">{editingContact ? 'Atualizar' : 'Adicionar'}</Button>
      </form>
      <List>
        {contacts.map((contact) => (
          <ContactItem
            key={contact._id}
            contact={contact}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </List>
      <FeedbackMessage message={message} onClose={() => setMessage('')} />
    </Container>
  );
}

export default App;
