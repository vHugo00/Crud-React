import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Container, Typography, TextField, Button, List, IconButton, Snackbar, Card, CardContent, CardActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { z } from 'zod';
import InputMask from 'react-input-mask';
import { motion } from 'framer-motion';
import logotipo from "./img/logo.jpg";

// Define o esquema de validação para contatos usando Zod
const contactSchema = z.object({
  name: z.string()
    .nonempty('O nome é obrigatório')
    .transform(name => name.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  email: z.string()
    .nonempty('O e-mail é obrigatório')
    .email('Formato de e-mail inválido')
    .refine(email => email.endsWith('@mmtech.com.br'), { message: 'O e-mail precisa ser da mmtech' }),
  phone: z.string()
    .nonempty('Digite seu número de telefone')
    .refine(phone => /^\(\d{2}\) 9 \d{4}-\d{4}$/.test(phone), { message: 'Formato de telefone inválido' }),
  message: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Componente para exibir mensagens de feedback
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

// Componente para exibir itens de contato individualmente
function ContactItem({ contact, onDelete, onEdit, onLike }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Card elevation={3} style={{ marginBottom: '1rem', position: 'relative' }}>
        <CardContent>
          <Typography variant="h6">{contact.name}</Typography>
          <Typography variant="subtitle1">Email: {contact.email}</Typography>
          <Typography variant="subtitle1">Telefone: {contact.phone}</Typography>
          {contact.imageUrl && (
            <img src={contact.imageUrl} alt="Imagem" style={{ maxWidth: '100%', marginBottom: '1rem' }} />
          )}
          <Typography variant="subtitle1">Mensagem: {contact.message}</Typography>
          <Typography variant="caption" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            {new Date(contact.timestamp).toLocaleString()}
          </Typography>
        </CardContent>
        <CardActions style={{ justifyContent: 'space-between' }}>
          <IconButton aria-label="like" onClick={() => onLike(contact._id)}>
            <FavoriteIcon color={contact.liked ? "secondary" : "default"} />
          </IconButton>
          <div>
            <IconButton aria-label="edit" onClick={() => onEdit(contact)}>
              <EditIcon />
            </IconButton>
            <IconButton aria-label="delete" onClick={() => onDelete(contact._id, contact.name)}>
              <DeleteIcon />
            </IconButton>
          </div>
        </CardActions>
      </Card>
    </motion.div>
  );
}

function App() {
  const [contacts, setContacts] = useState([]); // Estado para armazenar os contatos
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', message: '', imageUrl: '', timestamp: '' }); // Estado para armazenar os dados de um novo contato
  const [editingContact, setEditingContact] = useState(null); // Estado para armazenar o contato sendo editado
  const [errors, setErrors] = useState({}); // Estado para armazenar erros de validação
  const [message, setMessage] = useState(''); // Estado para armazenar mensagens de feedback
  const formRef = useRef(null); // Referência para o formulário

  useEffect(() => {
    fetchContacts(); // Carregar os contatos quando o componente é montado
  }, []);

  // Função para buscar os contatos da API
  const fetchContacts = async () => {
    const response = await axios.get('http://localhost:5000/contacts');
    setContacts(response.data);
  };

  // Função para lidar com o envio do formulário de contato
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validar os campos usando o esquema do Zod
      const contactWithTimestamp = {
        ...newContact,
        timestamp: new Date().toISOString(),
      };
      contactSchema.parse(contactWithTimestamp);

      if (editingContact) {
        await axios.put(`http://localhost:5000/contacts/${editingContact._id}`, contactWithTimestamp);
        showMessage('Contato atualizado com sucesso');
        setEditingContact(null);
      } else {
        await axios.post('http://localhost:5000/contacts', contactWithTimestamp);
        showMessage('Contato adicionado com sucesso');
      }

      setNewContact({ name: '', email: '', phone: '', message: '', imageUrl: '', timestamp: '' });
      setErrors({});
      fetchContacts();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = {};
        error.errors.forEach(err => {
          validationErrors[err.path[0]] = err.message;
        });
        setErrors(validationErrors);
      } else {
        setErrors({ global: error.message });
      }
      showMessage('Erro ao adicionar contato');
    }
  };

  // Função para lidar com a edição de um contato
  const handleEdit = (contact) => {
    setNewContact(contact);
    setEditingContact(contact);
    formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  // Função para lidar com a exclusão de um contato
  const handleDelete = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir ${name}?`)) {
      await axios.delete(`http://localhost:5000/contacts/${id}`);
      showMessage('Contato excluído com sucesso');
      fetchContacts();
    }
  };

  // Função para lidar com a ação de "curtir" um contato
  const handleLike = async (id) => {
    const contact = contacts.find(c => c._id === id);
    if (contact) {
      await axios.put(`http://localhost:5000/contacts/${id}`, { ...contact, liked: !contact.liked });
      fetchContacts();
    }
  };

  // Função para lidar com a mudança em um campo do formulário
  const handleFieldChange = (field, value) => {
    setNewContact(prevState => ({ ...prevState, [field]: value }));
    setErrors(prevErrors => ({ ...prevErrors, [field]: '' }));
  };

  // Função para lidar com o desfoque de um campo do formulário (validação)
  const handleFieldBlur = (field) => {
    try {
      contactSchema.pick({ [field]: true }).parse({ [field]: newContact[field] });
      setErrors(prevErrors => ({ ...prevErrors, [field]: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = error.errors[0];
        setErrors(prevErrors => ({ ...prevErrors, [field]: validationError.message }));
      }
    }
  };

  // Função para exibir uma mensagem por um determinado período de tempo - mensagens de erro/sucesso
  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  return (
    <Container maxWidth="md">
      <img src={logotipo} alt='logo' title='logo' style={{ width: '250px', height: 'auto' }} />
      <div ref={formRef}>
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label="Nome"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newContact.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              error={!!errors['name']}
              helperText={errors['name']}
              style={{ backgroundColor: '#F3F3F3' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newContact.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              onBlur={() => handleFieldBlur('email')}
              error={!!errors['email']}
              helperText={errors['email']}
              style={{ backgroundColor: '#F3F3F3' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <InputMask
              mask="(99) 9 9999-9999"
              value={newContact.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onBlur={() => handleFieldBlur('phone')}
              style={{ backgroundColor: '#F3F3F3' }}
            >
              {() => (
                <TextField
                  label="Telefone"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  error={!!errors['phone']}
                  helperText={errors['phone']}
                  style={{ backgroundColor: '#F3F3F3' }}
                />
              )}
            </InputMask>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label="Mensagem"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newContact.message}
              onChange={(e) => handleFieldChange('message', e.target.value)}
              style={{ backgroundColor: '#F3F3F3' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label="URL da imagem"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newContact.imageUrl}
              onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
              onBlur={() => handleFieldBlur('imageUrl')}
              error={!!errors['imageUrl']}
              helperText={errors['imageUrl']}
              style={{ backgroundColor: '#F3F3F3' }}
            />
          </div>
          {/* Outros campos do formulário (Email, Telefone, Mensagem, URL da Imagem) */}
          <Button
            variant="contained"
            type="submit"
            style={{
              alignSelf: 'flex-end',
              background: 'linear-gradient(to right, #169E9E, #652886)',
              color: 'white',
            }}
          >
            {editingContact ? 'Atualizar' : 'Adicionar'}
          </Button>
          {/* Botão de envio do formulário */}
        </form>
      </div>
      <List>
        {/* Mapear e renderizar cada item de contato */}
        {contacts.map((contact) => (
          <ContactItem
            key={contact._id}
            contact={contact}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onLike={handleLike}
          />
        ))}
      </List>
      {/* Componente para exibir feedback de mensagens */}
      <FeedbackMessage message={message} onClose={() => setMessage('')} />
    </Container>
  );
}

export default App;

