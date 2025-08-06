export default function Welcome() {
  return (
    <div className="welcome welcome-viewport">
      <div className="welcome-info">
        {/* <h1 className="header">llm-d </h1> */}
        <img
          className="llm-d-logo"
          width="75%"
          valign="middle"
          alt="llm-d"
          src="img/llm-d-logotype-and-icon.png"
        ></img>

        <h2 className="welcome-h2">
          llm-d: a Kubernetes-native high-performance distributed LLM inference framework
        </h2>


        <div className="button-group">
          <a className="static-button button-link" href="docs/architecture">
            Architecture
          </a>
          <a className="static-button button-link" href="docs/guide/Installation/prerequisites" >
            {/* Link to install page on the docs */}
            Installation
          </a>
          <a className="static-button button-link" href="docs/community">
            {/* Link to Community tab */}
            Community
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
