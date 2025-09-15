---
title: Upcoming llm-d Events
description: Meet the llm-d community at upcoming talks, meetups, and conferences
sidebar_label: Upcoming llm-d Events
sidebar_position: 2
---

# Upcoming llm-d Events

Stay connected with the llm-d community at meetups, conferences, and workshops. All meetings are open to the public unless noted otherwise.

{(() => {
  const events = [
    {
      month: 'September 2025',
      title: 'PyTorch ATX: The Future of Inferencing',
      location: 'Austin, TX',
      dateText: 'Sep 17, 2025',
      cost: 'Free',
      href: 'https://www.meetup.com/pytorch-atx/events/307742180/',
    },
    {
      month: 'September 2025',
      title: 'Boston vLLM + llm-d Meetup',
      location: 'Boston, MA',
      dateText: 'Sep 18, 2025',
      cost: 'Free',
      href: 'https://luma.com/vjfelimw',
    },
    {
      month: 'September 2025',
      title: 'DevConf.US 2025',
      location: 'Boston, MA',
      dateText: 'Sep 19–20, 2025',
      cost: 'Free',
      href: 'https://www.devconf.info/us/',
      sessions: [
        {
          title: 'llm-d: Kubernetes Native Distributed Inferencing',
          date: 'Fri, Sep 19, 2025',
          time: '9:15am – 9:50am',
          href: 'https://pretalx.devconf.info/devconf-us-2025/talk/GF8RJQ/',
        },
      ],
    },
    {
      month: 'October 2025',
      title: 'PyTorch Conference 2025',
      location: 'San Francisco, CA',
      dateText: 'Oct 22–23, 2025',
      cost: 'Paid',
      href: 'https://events.linuxfoundation.org/pytorch-conference/',
      sessions: [
        {
          title: 'Serving PyTorch LLMs at Scale: Disaggregated Inference With Kubernetes and llm-d',
          date: 'Thu, Oct 23, 2025',
          time: '11:35am – 12:00pm PDT',
          location: 'Room 2009 - 2011',
          href: 'https://pytorchconference.sched.com/event/27QDr',
        },
      ],
    },
    {
      month: 'November 2025',
      title: 'KubeCon + CloudNativeCon North America 2025',
      location: 'Atlanta, GA',
      dateText: 'Nov 10–13, 2025',
      cost: 'Paid',
      href: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/',
      sessions: [
        {
          title: 'Best Practices for Leveraging llm-d for Production-Scale Inference',
          date: 'Tue, Nov 11, 2025',
          time: '2:30pm – 3:00pm EST',
          location: 'Building B | Level 5 | Thomas Murphy Ballroom 1',
          href: 'https://kccncna2025.sched.com/event/27FWE?iframe=no',
        },
        {
          title: 'Routing Stateful AI Workloads in Kubernetes',
          date: 'Tue, Nov 11, 2025',
          time: '4:15pm – 4:45pm EST',
          location: 'Building B | Level 4 | B401-402',
          href: 'https://kccncna2025.sched.com/event/27FX6?iframe=no',
        },
        {
          title: 'llm-d: Multi-Accelerator LLM Inference on Kubernetes',
          date: 'Thu, Nov 13, 2025',
          time: '2:30pm – 3:00pm EST',
          location: 'Building B | Level 4 | B401-402',
          href: 'https://kccncna2025.sched.com/event/27Fee?iframe=no',
        },
      ],
    },
  ];

  const months = Array.from(new Set(events.map((e) => e.month)));

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px'
  };

  const cardStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '16px',
    border: '1px solid var(--ifm-color-emphasis-200)',
    borderRadius: '8px',
    backgroundColor: 'var(--ifm-background-surface-color)'
  };

  const buttonStyle = {
    display: 'inline-block',
    padding: '10px 16px',
    backgroundColor: 'var(--ifm-color-primary)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 600
  };

  const sectionStyle = {
    marginBottom: '28px'
  };

  const sessionListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const sessionItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px',
    border: '1px solid var(--ifm-color-emphasis-200)',
    borderLeft: '3px solid var(--ifm-color-primary)',
    borderRadius: '6px',
    backgroundColor: 'var(--ifm-background-surface-color)'
  };

  const headerRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '6px'
  };

  const sessionSectionStyle = {
    marginTop: '10px',
    padding: '12px',
    border: '1px solid var(--ifm-color-emphasis-200)',
    borderRadius: '8px',
    backgroundColor: 'var(--ifm-color-emphasis-100)'
  };

  return (
    <div>
      {months.map((m) => {
        const monthEvents = events.filter((e) => e.month === m);
        if (monthEvents.length === 0) return null;
        return (
          <div key={m} style={sectionStyle}>
            <h2>{m}</h2>
            <div style={containerStyle}>
              {monthEvents.map((e) => (
                e.sessions && e.sessions.length > 0 ? (
                  <div key={e.title} style={{...cardStyle, flexDirection: 'column', alignItems: 'stretch'}}>
                    <div style={headerRowStyle}>
                      <h4 style={{margin: 0, color: 'var(--ifm-color-primary)'}}>{e.title}</h4>
                      <a href={e.href} target="_blank" rel="noopener noreferrer" style={buttonStyle}>Register</a>
                    </div>
                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 6px 0'}}>
                      <span style={{fontSize: '12px', padding: '2px 8px', backgroundColor: 'var(--ifm-color-emphasis-100)', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: '999px'}}>📍 {e.location}</span>
                    </div>
                    <p style={{margin: 0, fontSize: '14px'}}>{e.dateText} · <strong>{e.cost}</strong></p>
                    <div style={sessionSectionStyle}>
                      <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--ifm-color-primary)'}}>Sessions</p>
                      <ul style={sessionListStyle}>
                        {e.sessions.map((s) => (
                          <li key={`${s.title}-${s.date}-${s.time}`} style={sessionItemStyle}>
                            <div>
                              <a href={s.href} target="_blank" rel="noopener noreferrer" style={{fontWeight: 600, color: 'var(--ifm-color-primary)'}}>{s.title}</a>
                              <div style={{fontSize: '12px', marginTop: '4px'}}>
                                {s.date} · {s.time}
                              </div>
                            </div>
                            <div style={{whiteSpace: 'nowrap'}}>
                              <a href={s.href} target="_blank" rel="noopener noreferrer" style={buttonStyle}>View details</a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div key={e.title} style={cardStyle}>
                    <div>
                      <h4 style={{margin: '0 0 6px 0', color: 'var(--ifm-color-primary)'}}>{e.title}</h4>
                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 6px 0'}}>
                        <span style={{fontSize: '12px', padding: '2px 8px', backgroundColor: 'var(--ifm-color-emphasis-100)', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: '999px'}}>📍 {e.location}</span>
                      </div>
                      <p style={{margin: 0, fontSize: '14px'}}>{e.dateText} · <strong>{e.cost}</strong></p>
                    </div>
                    <a href={e.href} target="_blank" rel="noopener noreferrer" style={buttonStyle}>Register</a>
                  </div>
                )
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
})()}