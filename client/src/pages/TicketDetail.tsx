import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Grid,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  responses: SupportResponse[];
}

interface SupportResponse {
  id: string;
  message: string;
  createdAt: string;
  user: {
    email: string;
  };
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id, token]);

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTicket(response.data);
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!newResponse.trim()) return;

    try {
      await axios.post(
        `/support/tickets/${id}/responses`,
        { message: newResponse },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewResponse('');
      fetchTicket();
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const handleUpdateStatus = async (newStatus: SupportTicket['status']) => {
    try {
      await axios.patch(
        `/support/tickets/${id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchTicket();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Container>
        <Typography variant="h5" color="error">
          Ticket not found
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Button variant="outlined" onClick={() => navigate('/support')} sx={{ mb: 2 }}>
          Back to Tickets
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          {ticket.title}
        </Typography>
        <Box display="flex" gap={2} mb={2}>
          <Chip
            label={`Status: ${ticket.status}`}
            color={ticket.status === 'OPEN' ? 'error' : 'success'}
          />
          <Chip
            label={`Priority: ${ticket.priority}`}
            color={
              ticket.priority === 'URGENT'
                ? 'error'
                : ticket.priority === 'HIGH'
                ? 'warning'
                : 'default'
            }
          />
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="body1" paragraph>
          {ticket.description}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Created: {new Date(ticket.createdAt).toLocaleString()}
        </Typography>
      </Paper>

      <Box mb={4}>
        <Typography variant="h6" gutterBottom>
          Responses
        </Typography>
        <Grid container spacing={3}>
          {ticket.responses.map((response) => (
            <Grid item xs={12} key={response.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body1">{response.message}</Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="textSecondary">
                    {response.user.email}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(response.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Response
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={newResponse}
          onChange={(e) => setNewResponse(e.target.value)}
          placeholder="Type your response here..."
          sx={{ mb: 2 }}
        />
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitResponse}
            disabled={!newResponse.trim()}
          >
            Submit Response
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleUpdateStatus('RESOLVED')}
          >
            Mark as Resolved
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TicketDetail; 