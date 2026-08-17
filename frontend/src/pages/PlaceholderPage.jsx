import '../styles/main.css'
import AppLayout from '../components/AppLayout'

function PlaceholderPage({ title }) {
  return (
    <AppLayout title={title} subtitle={`Manage your ${title.toLowerCase()} from VeriCargo.`}>
      <section className="card empty-page">
        <h2>{title}</h2>
        <p>This section is connected and ready for its next implementation step.</p>
      </section>
    </AppLayout>
  )
}

export default PlaceholderPage
