function TestApp() {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>ReLeaf Test App</h1>
      <p>If you can see this, React is working!</p>
      <button 
        style={{ 
          background: '#22c55e', 
          color: 'white', 
          padding: '10px 20px', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button clicked!')}
      >
        Test Button
      </button>
    </div>
  )
}

export default TestApp