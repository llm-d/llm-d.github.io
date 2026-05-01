import React from 'react';

const SLACK_URL = 'https://llm-d.slack.com';

export default function SlackButton(): React.JSX.Element {
  return (
    <a
      href={SLACK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="nav-pill"
    >
      <span className="nav-pill__label">Join Slack</span>
    </a>
  );
}
