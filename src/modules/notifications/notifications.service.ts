import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async findAllForUser(userId: string): Promise<Notification[]> {
    const notifications = await this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // If user has 0 notifications, seed meaningful demo notifications for realistic showcase
    if (notifications.length === 0) {
      const demoItems = [
        {
          userId,
          title: 'Site Visit Requested',
          message: 'Jean-Luc Habimana requested a site visit for Modern Villa in Kibagabaga.',
          type: 'VISIT',
          isRead: false,
        },
        {
          userId,
          title: 'Listing Approved',
          message: 'Your listing "2020 Mercedes-Benz C200 AMG Line" has been approved and is now live on BAZA.',
          type: 'APPROVED',
          isRead: false,
        },
        {
          userId,
          title: 'Price Alert',
          message: 'A saved listing in Gacuriro reduced price by 5,000,000 RWF.',
          type: 'PRICE',
          isRead: true,
        },
      ];
      const created = this.notificationsRepository.create(demoItems);
      return this.notificationsRepository.save(created);
    }

    return notifications;
  }

  async markAsRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }
}
