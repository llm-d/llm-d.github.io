---
title: Contributing to llm-d
description: Guidelines for contributing to the llm-d project
sidebar_label: Welcome to llm-d community
sidebar_position: 1
---

# Welcome to the llm-d Community

**Everyone is welcome!** The llm-d community is open to all - whether you're a seasoned developer, just getting started, a researcher, student, or simply curious about LLM infrastructure. We believe diverse perspectives make our project stronger.

This page is your gateway to everything you need to know about participating in the llm-d community. Whether you want to contribute code, join discussions, or just learn more, we've got you covered!

## Quick Start Guide

**New to llm-d?** Here's how to get started:

1. **Join our Slack** 💬 → <a href="/slack" target="_self">Get your invite</a> and visit [llm-d.slack.com](https://llm-d.slack.com)
2. **Explore our code** 📂 → [GitHub Organization](https://github.com/llm-d)
3. **Join a meeting** 📅 → [Add calendar](https://red.ht/llm-d-public-calendar)
4. **Pick your area** 🎯 → [Browse SIGs](#special-interest-groups-sigs) below

## Community Resources

### Getting Involved
- 📅 **[Upcoming Events](/community/events)** - Meetups, talks, and conferences
- 📝 **[Contributing Guidelines](/community/contribute)** - Complete guide to contributing code, docs, and ideas
- 👥 **[Special Interest Groups (SIGs)](/community/sigs)** - Join focused teams working on specific areas
- 🤝 **[Code of Conduct](/community/code-of-conduct)** - Our community standards and values

### Security & Safety
- 🛡️ **[Security Policy](/community/security)** - How to report vulnerabilities and security issues
- 📢 **[Security Announcements](https://groups.google.com/u/1/g/llm-d-security-announce)** - Stay updated on security news

### Communication Channels
- 💬 **Slack**: [llm-d Workspace](https://llm-d.slack.com) - Daily conversations and Q&A
- 📂 **GitHub**: [llm-d Organization](https://github.com/llm-d) - Code, issues, and discussions
- 📧 **Google Groups**: [llm-d Contributors](https://groups.google.com/g/llm-d-contributors) - Architecture diagrams and updates
- 📚 **Google Drive**: [Public Documentation](https://drive.google.com/drive/folders/1cN2YQiAZFJD_cb1ivlyukuNwecnin6lZ) - Meeting recordings and project docs

### Regular Meetings
- 📅 **Weekly Standup**: Every Wednesday at 12:30pm ET - Project updates and open discussion
- 🎯 **SIG Meetings**: Various times throughout the week - See [SIG details](/community/sigs#active-special-interest-groups) for schedules
- 🌟 **All meetings are open to the public** - Join to participate, ask questions, or just listen and learn

## Special Interest Groups (SIGs)

**Want to dive deeper into specific areas?** 🎯 Our Special Interest Groups are focused teams working on different aspects of llm-d:

import Link from '@docusaurus/Link';

{(() => {
  const sigCards = [
    {
      to: '/community/sigs#sig-router-formerly-inference-scheduler',
      title: 'Router',
      description: 'Intelligent request routing and load balancing',
    },
    {
      to: '/community/sigs#sig-benchmarking',
      title: 'Benchmarking',
      description: 'Performance testing and optimization',
    },
    {
      to: '/community/sigs#sig-pd-disaggregation',
      title: 'PD-Disaggregation',
      description: 'Prefill/decode separation patterns',
    },
    {
      to: '/community/sigs#sig-kv-disaggregation',
      title: 'KV-Disaggregation',
      description: 'KV caching and distributed storage',
    },
    {
      to: '/community/sigs#sig-installation',
      title: 'Installation',
      description: 'Kubernetes integration and deployment',
    },
    {
      to: '/community/sigs#sig-autoscaling',
      title: 'Autoscaling',
      description: 'Traffic-aware autoscaling and resource management',
    },
    {
      to: '/community/sigs#sig-observability',
      title: 'Observability',
      description: 'Monitoring, logging, and metrics',
    },
    {
      to: '/community/sigs#sig-rl',
      title: 'RL',
      description: 'Improve SOTA performance for RL workloads',
    },
    {
      to: '/community/sigs#sig-inference-payload-processor',
      title: 'Inference Payload Processor',
      description: 'Pluggable request/response payload processing and model selection',
    },
    {
      to: '/community/sigs#sig-batch-inference',
      title: 'Batch Inference',
      description: 'Asynchronous processing, request queueing, and batch gateway management',
    },
  ];

  const sigGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  };

  const sigCardStyle = {
    padding: '16px',
    border: '1px solid var(--ifm-color-emphasis-200)',
    borderRadius: '8px',
    backgroundColor: 'var(--ifm-background-surface-color)',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'all 0.2s ease',
  };

  const sigCardTitleStyle = {
    margin: '0 0 8px 0',
    color: 'var(--ifm-color-primary)',
  };

  const sigCardDescriptionStyle = {
    margin: 0,
    fontSize: '14px',
  };

  return (
    <div style={sigGridStyle}>
      {sigCards.map((sig) => (
        <Link key={sig.to} to={sig.to} className="community-sig-card" style={sigCardStyle}>
          <h4 style={sigCardTitleStyle}>{sig.title}</h4>
          <p style={sigCardDescriptionStyle}>{sig.description}</p>
        </Link>
      ))}
    </div>
  );
})()}

<p style={{marginTop: '16px', textAlign: 'center'}}>
  <a href="/community/sigs" style={{
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: 'var(--ifm-color-primary)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600'
  }}>View more SIG Details →</a>
</p>

## Connect With Us

Follow llm-d across social platforms for updates, discussions, and community highlights:

- 💼 **LinkedIn**: [@llm-d](https://linkedin.com/company/llm-d)
- 🦋 **Bluesky**: [@llm-d.ai](https://bsky.app/profile/llm-d.ai)
- 🐦 **X (Twitter)**: [@\_llm_d\_](https://x.com/_llm_d_)
- 🤖 **Reddit**: [r/llm_d](https://www.reddit.com/r/llm_d/)

## Public Meeting Calendar

**All meetings are open to the public!** 📅 Whether you want to actively participate, ask questions, or just observe and learn, you're invited. Stay up-to-date with all llm-d community events, SIG meetings, and contributor standups. All times are shown in Eastern Time (ET).

<div style={{
  marginTop: '24px',
  padding: '20px',
  backgroundColor: 'var(--ifm-background-surface-color)',
  borderRadius: '8px',
  border: '1px solid var(--ifm-color-emphasis-200)',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}>
  <div style={{
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--ifm-color-emphasis-100)',
    borderRadius: '4px',
    fontSize: '14px',
    color: 'var(--ifm-color-emphasis-700)'
  }}>
    💡 <strong>Tip:</strong> Click on any event in the calendar below to get meeting details and join links. 
    You can also <a href="https://calendar.google.com/calendar/u/0?cid=NzA4ZWNlZDY0NDBjYjBkYzA3NjdlZTNhZTk2NWQ2ZTc1Y2U5NTZlMzA5MzhmYTAyZmQ3ZmU1MDJjMDBhNTRiNEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t" target="_blank">add this calendar to your Google Calendar</a> to never miss an event!
  </div>
  
  <div style={{position: 'relative', width: '100%', height: '600px', overflow: 'hidden', borderRadius: '6px'}}>
    <iframe 
      src="https://calendar.google.com/calendar/embed?height=600&wkst=2&ctz=America%2FNew_York&title=llm-d%20Public%20Meetings&showPrint=0&mode=AGENDA&showCalendars=0&showTabs=0&src=NzA4ZWNlZDY0NDBjYjBkYzA3NjdlZTNhZTk2NWQ2ZTc1Y2U5NTZlMzA5MzhmYTAyZmQ3ZmU1MDJjMDBhNTRiNEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23f09300" 
      style={{
        borderWidth: 0,
        width: '100%',
        height: '100%',
        minWidth: '320px'
      }} 
      frameBorder="0" 
      scrolling="no">
    </iframe>
  </div>
</div>

## Need Help?

**Questions? Ideas? Just want to chat?** We're here to help! The llm-d community team is friendly and responsive.

- 💬 **Slack**: Join our [Slack workspace](https://llm-d.slack.com) and mention `@community-team` for quick responses
- 🐛 **GitHub Issues**: [Open an issue](https://github.com/llm-d/llm-d/issues) for bug reports, feature requests, or general questions  
- 📧 **Mailing List**: [llm-d Contributors](https://groups.google.com/g/llm-d-contributors) for broader community discussions
