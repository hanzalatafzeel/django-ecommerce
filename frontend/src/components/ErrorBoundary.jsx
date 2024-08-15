import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>⚠️</div>
          <h2>Something went wrong</h2>
          <p className="muted small">{String(this.state.error?.message || this.state.error)}</p>
          <Link to="/"><button className="primary">Back to home</button></Link>
        </div>
      )
    }
    return this.props.children
  }
}