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
          Distributed AI inference with the compute resources you{" "}
          <b>
            <em>have</em>
          </b>
        </h2>
        

        <div className="button-group">
          <button className="static-button">
            <a className="button-link" href="docs/architecture/architecture">
              About llm-d
            </a>
          </button>
          <button className="static-button">
            <a
              className="button-link"
              href="docs/guide/Installation/Prerequisites"
            >
              {/* Link to install page on the docs */}
              Installation
            </a>
          </button>
          <button className="static-button">
            <a className="button-link" href="docs/community/work_with_us">
              {/* Link to Community tab */}
              Community
            </a>
          </button>
        </div>

        <div className="hidden-for-mobile">
          <p>
            While some distributed AI solutions rely on a single vendor's
            hardware, If you have a heterogeneous compute environment that
            includes AMD or Intel accelerators in addition to NVIDIA GPUs, you
            want a distributed inference solution based on vLLM.
          </p>

          <ul className="ul-bulleted">
            <li>
              <strong>llm-d</strong> is a toolbox of components which together
              enable distributed inference in just such a heterogenous compute
              environment.
            </li>
            <li>
              <strong>llm-d</strong> allows you to achieve distributed AI
              inference with the compute resources you <em>have</em> rather than
              the resources someone wishes to <em>sell</em>
            </li>
          </ul>
        </div>
        
      </div>
    </div>
  );
}
