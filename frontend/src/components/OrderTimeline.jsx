const FLOW = ['pending', 'payment_confirmed', 'packed', 'shipped', 'in_transit', 'delivered']

const LABELS = {
  pending: 'Pending',
  payment_confirmed: 'Payment Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  in_transit: 'In Transit',
  delivered: 'Delivered',
}

export default function OrderTimeline({ status }) {
  const idx = FLOW.indexOf(status)
  return (
    <div className="timeline">
      {FLOW.map((s, i) => (
        <div key={s} className={`step${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`}>
          {LABELS[s]}
        </div>
      ))}
    </div>
  )
}