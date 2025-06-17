import React from 'react';

const VideoEmbed = ({ 
  videoId, 
  width = '100%', 
  height = '360',
  responsive = true,
  autoplay = false,
  modestbranding = true,
  rel = false
}) => {
  // Construct the URL with optional parameters
  const params = new URLSearchParams({
    autoplay: autoplay ? 1 : 0,
    modestbranding: modestbranding ? 1 : 0,
    rel: rel ? 1 : 0
  });
  
  const src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  
  const iframe = (
    <iframe
      src={src}
      style={responsive ? {
        width: '100%',
        height: '100%'
      } : {
        width,
        height
      }}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );

  if (responsive) {
    return (
      <div style={{ 
        position: 'relative', 
        paddingBottom: '56.25%', 
        height: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}>
          {iframe}
        </div>
      </div>
    );
  }

  return iframe;
};

export default VideoEmbed; 