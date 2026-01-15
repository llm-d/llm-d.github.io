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
      month: 'March 2026',
      title: 'KubeCon + CloudNativeCon Europe 2026',
      location: 'London, UK',
      dateText: 'March 24–26, 2026',
      cost: 'Paid',
      href: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/',
      sessions: [
        {
          title: 'Route, Serve, Adapt, Repeat: Adaptive Routing for AI Inference Workloads in Kubernetes',
          date: 'Wed, Mar 25, 2026',
          time: '11:45am – 12:15pm CET',
          location: 'Auditorium',
          href: 'https://kccnceu2026.sched.com/event/2CW2C/route-serve-adapt-repeat-adaptive-routing-for-ai-inference-workloads-in-kubernetes-nir-rozenbaum-ibm-kellen-swain-google',
        },
        {
          title: 'Tutorial: KV-Cache Wins You Can Feel: Building AI-Aware LLM Routing on Kubernetes',
          date: 'Thu, Mar 26, 2026',
          time: '11:00am – 12:15pm CET',
          location: 'Elicium Ballroom 1',
          href: 'https://kccnceu2026.sched.com/event/2CW5y/tutorial-kv-cache-wins-you-can-feel-building-ai-aware-llm-routing-on-kubernetes-tyler-michael-smith-red-hat-kay-yan-daocloud-danny-harnik-michal-malka-maroon-ayoub-ibm',
        },
        {
          title: 'Evolving KServe: The Unified Model Inference Platform for Both Predictive and Generative AI',
          date: 'Thu, Mar 26, 2026',
          time: '1:45pm - 2:15pm CET',
          location: 'E103-105',
          href: 'https://sched.co/2EF54',
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

  const titleRowLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  };

  // no icon-only button in this variant

  const getSessionStartEpoch = (s) => {
    try {
      const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const dateText = String(s.date || '');
      const timeText = String(s.time || '');

      const dateMatch = dateText.match(/([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/);
      if (!dateMatch) return Number.MAX_SAFE_INTEGER;
      const monthIdx = monthMap[dateMatch[1]];
      const day = parseInt(dateMatch[2], 10);
      const year = parseInt(dateMatch[3], 10);

      const timeMatch = timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      const hour12 = timeMatch ? parseInt(timeMatch[1] || '0', 10) : 0;
      const minute = timeMatch && timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch ? (timeMatch[3] || '').toLowerCase() : 'am';
      let hour24 = hour12 % 12;
      if (meridiem === 'pm') hour24 += 12;

      const dt = new Date(year, monthIdx, day, hour24, minute, 0, 0);
      return dt.getTime();
    } catch {
      return Number.MAX_SAFE_INTEGER;
    }
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
                <div key={e.title} style={{...cardStyle, flexDirection: 'column', alignItems: 'stretch'}}>
                  <div style={headerRowStyle}>
                    <div style={titleRowLeftStyle}>
                      <h4 style={{margin: 0, color: 'var(--ifm-color-primary)'}}>{e.title}</h4>
                    </div>
                    <a href={e.href} target="_blank" rel="noopener noreferrer" style={buttonStyle}>Register</a>
                  </div>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 6px 0'}}>
                    <span style={{fontSize: '12px', padding: '2px 8px', backgroundColor: 'var(--ifm-color-emphasis-100)', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: '999px'}}>📍 {e.location}</span>
                  </div>
                  <p style={{margin: 0, fontSize: '14px'}}>{e.dateText} · <strong>{e.cost}</strong></p>
                  {e.sessions && e.sessions.length > 0 && (
                    <div style={sessionSectionStyle}>
                      <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--ifm-color-primary)'}}>Sessions</p>
                      <ul style={sessionListStyle}>
                        {[...e.sessions].sort((a, b) => getSessionStartEpoch(a) - getSessionStartEpoch(b)).map((s) => (
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
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
})()}
