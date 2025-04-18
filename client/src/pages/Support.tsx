import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  createdAt: string;
  updatedAt: string;
  responses: SupportResponse[];
  attachments: Attachment[];
}

interface SupportResponse {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  attachments: Attachment[];
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const Support: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [openNewTicket, setOpenNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'GENERAL',
  });
  const [newResponse, setNewResponse] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const categories = [
    'GENERAL',
    'TECHNICAL',
    'BILLING',
    'FEATURE_REQUEST',
    'BUG_REPORT',
  ];

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/support/tickets', {
        headers: getAuthHeaders(),
      });
      setTickets(response.data);
      setFilteredTickets(response.data);
    } catch (error) {
      showNotification('Failed to fetch tickets', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const filtered = tickets.filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedTab === 0 || ticket.status === ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'][selectedTab - 1];
      return matchesSearch && matchesStatus;
    });
    setFilteredTickets(filtered);
  }, [tickets, searchQuery, selectedTab]);

  const handleCreateTicket = async () => {
    if (!newTicket.title || !newTicket.description) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', newTicket.title);
      formData.append('description', newTicket.description);
      formData.append('priority', newTicket.priority);
      formData.append('category', newTicket.category);
      selectedFiles.forEach(file => formData.append('attachments', file));

      await axios.post('/api/support/tickets', formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      showNotification('Ticket created successfully', 'success');
      setOpenNewTicket(false);
      setNewTicket({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL' });
      setSelectedFiles([]);
      fetchTickets();
    } catch (error) {
      showNotification('Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('message', newResponse);
      selectedFiles.forEach(file => formData.append('attachments', file));

      await axios.post(`/api/support/tickets/${selectedTicket.id}/responses`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      showNotification('Response added successfully', 'success');
      setNewResponse('');
      setSelectedFiles([]);
      fetchTickets();
    } catch (error) {
      showNotification('Failed to add response', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const showNotification = (message: string, type: Notification['type']) => {
    setNotification({ message, type });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'error';
      case 'IN_PROGRESS':
        return 'warning';
      case 'RESOLVED':
        return 'success';
      case 'CLOSED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Support Center
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchTickets} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenNewTicket(true)}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 4, p: 2 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" />
          <Tab label="Open" />
          <Tab label="In Progress" />
          <Tab label="Resolved" />
          <Tab label="Closed" />
        </Tabs>
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredTickets.map((ticket) => (
            <Grid item xs={12} key={ticket.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6" component="h2">
                        {ticket.title}
                      </Typography>
                      <Typography color="textSecondary" gutterBottom>
                        Category: {ticket.category}
                      </Typography>
                    </Box>
                    <Box>
                      <Chip
                        label={ticket.status}
                        color={getStatusColor(ticket.status)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={ticket.priority}
                        color={getPriorityColor(ticket.priority)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" component="p" sx={{ mt: 2 }}>
                    {ticket.description}
                  </Typography>
                  {ticket.attachments.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Attachments:
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {ticket.attachments.map((attachment) => (
                          <Chip
                            key={attachment.id}
                            icon={<AttachFileIcon />}
                            label={`${attachment.filename} (${formatFileSize(attachment.size)})`}
                            onClick={() => window.open(attachment.url, '_blank')}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                    Created: {new Date(ticket.createdAt).toLocaleString()}
                    {ticket.updatedAt !== ticket.createdAt && (
                      <> | Updated: {new Date(ticket.updatedAt).toLocaleString()}</>
                    )}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New Ticket Dialog */}
      <Dialog
        open={openNewTicket}
        onClose={() => !isSubmitting && setOpenNewTicket(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create New Support Ticket
          <IconButton
            aria-label="close"
            onClick={() => setOpenNewTicket(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            disabled={isSubmitting}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            required
            value={newTicket.title}
            onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
            disabled={isSubmitting}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            required
            value={newTicket.description}
            onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
            disabled={isSubmitting}
          />
          <Box display="flex" gap={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                disabled={isSubmitting}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newTicket.category}
                onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                disabled={isSubmitting}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box mt={2}>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="ticket-attachments"
              disabled={isSubmitting}
            />
            <label htmlFor="ticket-attachments">
              <Button
                variant="outlined"
                component="span"
                startIcon={<AttachFileIcon />}
                disabled={isSubmitting}
              >
                Attach Files
              </Button>
            </label>
            {selectedFiles.length > 0 && (
              <Box mt={1}>
                {selectedFiles.map((file, index) => (
                  <Chip
                    key={index}
                    label={`${file.name} (${formatFileSize(file.size)})`}
                    onDelete={() => {
                      setSelectedFiles(files => files.filter((_, i) => i !== index));
                    }}
                    sx={{ mr: 1, mt: 1 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewTicket(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateTicket}
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog
        open={!!selectedTicket}
        onClose={() => !isSubmitting && setSelectedTicket(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedTicket && (
          <>
            <DialogTitle>
              Ticket Details
              <IconButton
                aria-label="close"
                onClick={() => setSelectedTicket(null)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
                disabled={isSubmitting}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box mb={3}>
                <Typography variant="h6">{selectedTicket.title}</Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Chip
                    label={selectedTicket.status}
                    color={getStatusColor(selectedTicket.status)}
                    size="small"
                  />
                  <Chip
                    label={selectedTicket.priority}
                    color={getPriorityColor(selectedTicket.priority)}
                    size="small"
                  />
                  <Chip
                    label={selectedTicket.category}
                    variant="outlined"
                    size="small"
                  />
                </Box>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  {selectedTicket.description}
                </Typography>
              </Box>

              <Typography variant="h6" gutterBottom>
                Responses
              </Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {selectedTicket.responses.map((response) => (
                  <Paper key={response.id} sx={{ p: 2, mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">
                        {response.user.name} ({response.user.email})
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(response.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{response.message}</Typography>
                    {response.attachments.length > 0 && (
                      <Box mt={1}>
                        {response.attachments.map((attachment) => (
                          <Chip
                            key={attachment.id}
                            icon={<AttachFileIcon />}
                            label={`${attachment.filename} (${formatFileSize(attachment.size)})`}
                            onClick={() => window.open(attachment.url, '_blank')}
                            sx={{ mr: 1, mt: 1 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>

              <Box mt={3}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Type your response..."
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  disabled={isSubmitting}
                />
                <Box mt={2}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="response-attachments"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="response-attachments">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFileIcon />}
                      disabled={isSubmitting}
                    >
                      Attach Files
                    </Button>
                  </label>
                  {selectedFiles.length > 0 && (
                    <Box mt={1}>
                      {selectedFiles.map((file, index) => (
                        <Chip
                          key={index}
                          label={`${file.name} (${formatFileSize(file.size)})`}
                          onDelete={() => {
                            setSelectedFiles(files => files.filter((_, i) => i !== index));
                          }}
                          sx={{ mr: 1, mt: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedTicket(null)} disabled={isSubmitting}>
                Close
              </Button>
              <Button
                onClick={handleAddResponse}
                color="primary"
                disabled={isSubmitting || !newResponse.trim()}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {isSubmitting ? 'Sending...' : 'Send Response'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.type}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Support; 