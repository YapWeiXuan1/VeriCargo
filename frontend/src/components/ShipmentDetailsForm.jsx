import '../styles/shipment.css'

const fields = [
  ['cargo_name', 'Cargo name', 'text', 160], ['cargo_category', 'Cargo category', 'text', 100],
  ['cargo_description', 'Cargo description', 'textarea', 2000],
  ['origin', 'Origin', 'text', 300], ['destination', 'Destination', 'text', 300],
  ['weight', 'Weight', 'number'], ['weight_unit', 'Weight unit', 'select'], ['quantity', 'Quantity', 'number'],
  ['handling_instructions', 'Handling instructions (optional)', 'textarea', 2000],
  ['tracking_number', 'Tracking number (optional)', 'text', 160],
]

export default function ShipmentDetailsForm({ value, onChange, errors, disabled = false }) {
  return <section className="shipment-form" aria-labelledby="shipment-details-title">
    <div className="shipment-section-heading"><span>01</span><div><h2 id="shipment-details-title">Shipment details</h2><p>Off-chain operational information shared with the assigned carrier.</p></div></div>
    <fieldset className="shipment-form__grid" disabled={disabled}>{fields.map(([name, label, type, maxLength]) => {
      const props = { id: `shipment-${name}`, value: value[name] ?? '', onChange: (event) => onChange(name, event.target.value), 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `shipment-error-${name}` : undefined }
      return <label key={name} className={type === 'textarea' ? 'shipment-form__wide' : ''}>{label}
        {type === 'textarea' ? <textarea {...props} rows={2} maxLength={maxLength} /> : type === 'select' ? <select {...props}><option value="kg">Kilograms (kg)</option><option value="t">Tonnes (t)</option><option value="lb">Pounds (lb)</option></select> : <input {...props} type={type} maxLength={maxLength} min={type === 'number' ? name === 'quantity' ? '1' : '0.000001' : undefined} step={type === 'number' ? name === 'quantity' ? '1' : 'any' : undefined} />}
        {errors[name] && <span id={`shipment-error-${name}`} className="field-error">{errors[name]}</span>}
      </label>
    })}</fieldset>
  </section>
}
