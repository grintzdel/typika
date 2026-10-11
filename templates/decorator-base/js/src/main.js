import { createEmailNotifier } from './notifications/notifiers.js'

let now = 0
let smtpHiccups = 1

const notify = createEmailNotifier({
  mailer: {
    send: (to, body) => {
      if (to === 'grace@example.com' && smtpHiccups > 0) {
        smtpHiccups -= 1
        console.log(`  smtp    timeout while sending to ${to}`)
        throw new Error('SMTP timeout')
      }
      console.log(`  email   to ${to}: ${body}`)
    },
  },
  logger: { info: (line) => console.log(`  log     ${line}`) },
  clock: { now: () => now },
})

console.log('Ada: order shipped')
notify('ada@example.com', 'Your order order-1 has shipped.')

console.log('Ada: order delivered, ten seconds later')
now += 10_000
notify('ada@example.com', 'Your order order-1 has been delivered.')

console.log('Ada: order delivered, one minute later')
now += 60_000
notify('ada@example.com', 'Your order order-1 has been delivered.')

console.log('Grace: order shipped, through a flaky SMTP server')
notify('grace@example.com', 'Your order order-2 has shipped.')
