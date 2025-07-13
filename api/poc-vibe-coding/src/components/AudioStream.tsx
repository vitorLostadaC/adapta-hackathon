import useRecorder from '../hooks/useRecorder';

const AudioStream = () => {
  const {
    isRecording,
    startRecording,
    stopRecording,
    finalTranscription,
    interimTranscription,
  } = useRecorder();

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isRecording ? '#ef4444' : '#6b7280',
            transition: 'background-color 200ms ease',
          }}
        />
        <span style={{ color: isRecording ? '#ef4444' : '#6b7280' }}>
          {isRecording ? 'Recording...' : 'Stopped'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            padding: '8px 16px',
            backgroundColor: isRecording ? '#d1d5db' : '#3b82f6',
            color: isRecording ? '#6b7280' : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isRecording ? 'not-allowed' : 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          Start Recording
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            padding: '8px 16px',
            backgroundColor: !isRecording ? '#d1d5db' : '#ef4444',
            color: !isRecording ? '#6b7280' : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !isRecording ? 'not-allowed' : 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          Stop Recording
        </button>
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          minHeight: '100px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Transcription:</h3>
        <p style={{ margin: 0, color: '#374151' }}>
          {finalTranscription}
          <span style={{ color: '#6b7280' }}> {interimTranscription}</span>
        </p>
      </div>
    </div>
  );
};

export default AudioStream; 
