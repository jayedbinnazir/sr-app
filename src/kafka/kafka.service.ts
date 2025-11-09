import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, logLevel } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private admin: Admin;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'kafka-service',
      brokers: [
        'kafka-broker-1:9092', // Use internal PLAINTEXT listener
        'kafka-broker-2:9092',
        'kafka-broker-3:9092',
      ],
      logLevel: logLevel.INFO,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.admin = this.kafka.admin();
  }

  async onModuleDestroy() {
    await this.admin.disconnect();
  }

  async onModuleInit() {
    // Wait a bit for Kafka cluster to be ready
    await new Promise((resolve) => setTimeout(resolve, 30000));
    await this.connectAndCreateTopics();
  }

  private async connectAndCreateTopics() {
    let retries = 5;

    while (retries > 0) {
      try {
        console.log('🔄 Attempting to connect to Kafka cluster...');
        await this.admin.connect();
        console.log('✅ Connected to Kafka cluster');

        const topics = await this.admin.listTopics();
        console.log('📋 Existing topics:', topics);

        const topicsToCreate = [
          { topic: 'topic-1', numPartitions: 3, replicationFactor: 3 },
          { topic: 'topic-2', numPartitions: 3, replicationFactor: 3 },
          { topic: 'topic-3', numPartitions: 3, replicationFactor: 3 },
        ].filter((topicConfig) => !topics.includes(topicConfig.topic));

        if (topicsToCreate.length > 0) {
          const created = await this.admin.createTopics({
            topics: topicsToCreate,
            waitForLeaders: true,
            timeout: 30000,
          });
          console.log('🎉 Topics created successfully:', created);
        } else {
          console.log('✅ All topics already exist');
        }

        return; // Success, exit retry loop
      } catch (error) {
        console.error(
          `❌ Kafka connection attempt failed (${retries} retries left):`,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          error.message,
        );
        retries--;

        if (retries === 0) {
          console.error('💥 All connection attempts failed');
          throw error;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
}
