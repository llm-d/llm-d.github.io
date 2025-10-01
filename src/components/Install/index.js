//import styles from "./styles.module.css"
//import count1URL from '/docs/assets/counting-01.png';


export default function Install() {
  return (
    <>
      {/* ----------------------------- Install Section ---------------------------- */}
      <div className="install viewport" id="install">
        <div className="install-info">
          <div className="install-header">
            <h1 className="install-h1">Try the Quickstart Demo </h1>
          </div>
          <h2 className="install-h2">It's as easy as 1...2...llm-d!</h2>

          {/* ----------- Modular Section (copy and paste as many as needed) ---------- */}
          <h3 className="install-h3">
            <img
              //className="llm-d-logo"
              width="50px"
              valign="middle"
              alt="1. "
              src={require('/docs/assets/counting-01.png').default}
              ></img>
            <a className="link" href="docs/guide/Installation/prerequisites">
              Check the Prerequisites
            </a>
          </h3>
          <h3 className="install-h3">
            <img
              //className="llm-d-logo"
              width="50px"
              valign="middle"
              alt="2. "
              src={require('/docs/assets/counting-02.png').default}
              ></img>
            <a className="link" href="docs/guide/Installation/quickstart">
              Run the Quickstart
            </a>
          </h3>
          <h3 className="install-h3">
            <img
              //className="llm-d-logo"
              width="50px"
              valign="middle"
              alt="3. "
              src={require('/docs/assets/counting-03.png').default}
              ></img>
              <a className="link" href="docs/guide#our-well-lit-paths">Explore llm-d!</a></h3>
          {/* -------------------------------------------------------------------------- */}
          <a className="static-button install-button button-link" href="docs/guide">
            Complete install methods here
          </a>
        </div>
      </div>
    </>
  );
}
