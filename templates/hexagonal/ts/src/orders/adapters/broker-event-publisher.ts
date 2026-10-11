import type { FakeBroker } from '../../infrastructure/fake-broker.ts'
import type { OrderEvent, OrderEventPublisher } from '../ports.ts'

const payloadOf = ({ type, order }: OrderEvent) => {
  switch (type) {
    case 'OrderPlaced':
      return { orderId: order.id, customerEmail: order.customer.email, totalCents: order.total.cents }
    case 'OrderPaid':
      return { orderId: order.id, totalCents: order.total.cents }
    case 'OrderShipped':
    case 'OrderDelivered':
    case 'OrderCancelled':
      return { orderId: order.id }
  }
}

export class BrokerEventPublisher implements OrderEventPublisher {
  private readonly broker: FakeBroker

  constructor(broker: FakeBroker) {
    this.broker = broker
  }

  publish(event: OrderEvent): void {
    this.broker.publish(event.type, payloadOf(event))
  }
}
