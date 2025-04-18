import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new support ticket
router.post('/tickets', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        priority,
        userId,
      },
    });

    return res.json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// Get all tickets for the current user
router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        responses: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// Get a specific ticket
router.get('/tickets/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        responses: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
});

// Add a response to a ticket
router.post('/tickets/:id/responses', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await prisma.supportResponse.create({
      data: {
        message,
        userId,
        ticketId: id,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return res.json(response);
  } catch (error) {
    console.error('Error adding response:', error);
    return res.status(500).json({ error: 'Failed to add response' });
  }
});

// Update ticket status
router.patch('/tickets/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticket = await prisma.supportTicket.update({
      where: {
        id,
        userId,
      },
      data: { status },
    });

    return res.json(ticket);
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

export default router; 