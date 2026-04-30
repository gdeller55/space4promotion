export default function TestScreen() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'red',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', margin: '20px' }}>
        TEST SCREEN WORKS
      </h1>
      
      <p style={{ fontSize: '24px' }}>
        If you can see this red screen, routing works fine.
      </p>
    </div>
  );
}