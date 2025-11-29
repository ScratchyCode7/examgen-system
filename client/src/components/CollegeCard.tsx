interface CollegeCardProps {
  name: string;
  logo: {
    backgroundColor: string;
    borderColor?: string;
    icon: React.ReactNode;
    text: string;
  };
}

export const CollegeCard = ({ name, logo }: CollegeCardProps) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    }}
    >
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: logo.backgroundColor,
        border: logo.borderColor ? `4px solid ${logo.borderColor}` : 'none',
        margin: '0 auto 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {logo.icon}
        {logo.text && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '0.5rem',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            width: '90%',
            lineHeight: '1.2'
          }}>
            {logo.text}
          </div>
        )}
      </div>
      <h3 style={{
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#1a365d'
      }}>
        {name}
      </h3>
    </div>
  );
};

