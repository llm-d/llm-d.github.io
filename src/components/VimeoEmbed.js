import React from 'react';

const VimeoEmbed = ({ 
  videoId, 
  hash, 
  width = '100%', 
  height = '360',
  responsive = true 
}) => {
  // Construct the URL based on whether it's a private or public video
  const src = hash 
    ? `https://player.vimeo.com/video/${videoId}?h=${hash}` // Private video with hash
    : `https://player.vimeo.com/video/${videoId}`; // Public video
  
  if (responsive) {
    return (
      <div style={{ 
        position: 'relative', 
        paddingBottom: '56.25%', 
        height: 0,
        overflow: 'hidden'
      }}>
        <iframe
          src={src}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <iframe
      src={src}
      width={width}
      height={height}
      frameBorder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
};

export default VimeoEmbed;