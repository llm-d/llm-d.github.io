import ThemedImage from '@theme/ThemedImage';

export default function Welcome() {
  return (
    <div className="welcome welcome-viewport">
      <div className="welcome-info">
        <ThemedImage
          className="llm-d-logo"
          width="75%"
          alt="llm-d"
          sources={{
            light: '/img/llm-d-logo-light.svg',
            dark: '/img/llm-d-logo-dark.svg',
          }}
        />

        <h2 className="welcome-h2">
          llm-d: a high-performance and scalable distributed LLM inference framework
        </h2>


        <div className="button-group">
          <a className="static-button button-link" href="/docs/getting-started">
            Documentation
          </a>
          <a className="static-button button-link" href="/blog">
            Blog
          </a>
          <a className="static-button button-link" href="/community">
            Community
          </a>
          <a className="static-button button-link" href="/videos">
            Videos
          </a>
        </div>

        <div className="hidden-for-mobile">
          <p>
            llm-d is a well-lit path for anyone to serve at scale,
            with the fastest time-to-value and competitive performance per dollar,
            for most models across a diverse and comprehensive set of hardware accelerators.
          </p>

        </div>

      </div>
    </div>
  );
}
