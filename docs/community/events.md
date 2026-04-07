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
      month: 'April 2026',
      title: 'PyTorch Conference Europe 2026',
      location: 'Paris, France',
      dateText: 'April 7–8, 2026',
      cost: 'Paid',
      href: 'https://events.linuxfoundation.org/pytorch-conference-europe/',
      sessions: [
        {
          title: 'Why WideEP Inference Needs Data-Parallel-Aware Scheduling',
          date: 'Tue, Apr 7, 2026',
          time: '13:35 – 14:00 CEST',
          location: 'Central Room',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2Hind/why-wideep-inference-needs-data-parallel-aware-scheduling-nili-guy-ibm-tyler-michael-smith-red-hat',
        },
        {
          title: 'The Token Slice: Implementing Preemptive Scheduling Via Chunked Decoding',
          date: 'Tue, Apr 7, 2026',
          time: '14:05 – 14:30 CEST',
          location: 'Central Room',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2Hins/the-token-slice-implementing-preemptive-scheduling-via-chunked-decoding-etai-lev-ran-ibm-kellen-swain-google',
        },
        {
          title: 'Birds of A Feather: Disaggregated Tokenization: Building Toward Tokens-In-Tokens-Out LLM Inference',
          date: 'Wed, Apr 8, 2026',
          time: '10:10 – 10:35 CEST',
          location: 'TBA',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2Hiow/birds-of-a-feather-disaggregated-tokenization-building-toward-tokens-in-tokens-out-llm-inference-maroon-ayoub-ibm-research-hang-yin-xi-ning-wang-alibaba-cloud-nili-guy-ibm-hyunkyun-moon-moreh',
        },
        {
          title: 'Lightning Talk: Beyond Generic Spans: Distributed Tracing for Actionable LLM Observability',
          date: 'Tue, Apr 7, 2026',
          time: '15:45 – 15:55 CEST',
          location: 'Master Stage',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2HioV/lightning-talk-beyond-generic-spans-distributed-tracing-for-actionable-llm-observability-sally-omalley-greg-pereira-red-hat',
        },
        {
          title: 'Lightning Talk: KV-Cache Centric Inference: Building a State-Aware Serving Platform With llm-d and vLLM',
          date: 'Wed, Apr 8, 2026',
          time: '11:10 – 11:20 CEST',
          location: 'Founders Cafe',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2HipK/lightning-talk-kv-cache-centric-inference-building-a-state-aware-serving-platform-with-llm-d-and-vllm-maroon-ayoub-ibm-research',
        },
        {
          title: 'Lightning Talk: Not All Tokens Are Equal: Semantic KV-Cache for Agentic LLM Serving',
          date: 'Wed, Apr 8, 2026',
          time: '11:25 – 11:35 CEST',
          location: 'Founders Cafe',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2HipQ/lightning-talk-not-all-tokens-are-equal-semantic-kv-cache-for-agentic-llm-serving-maroon-ayoub-ibm-research-hyunkyun-moon-moreh',
        },
        {
          title: "Lightning Talk: Inside vLLM's KV Offloading Connector: Async Memory Transfers for Higher Inference Throughput",
          date: 'Wed, Apr 8, 2026',
          time: '14:20 – 14:30 CEST',
          location: 'Central Room',
          href: 'https://pytorchconferenceeu2026.sched.com/event/2HiqO/lightning-talk-inside-vllms-kv-offloading-connector-async-memory-transfers-for-higher-inference-throughput-or-ozeri-ibm-nicolo-lucchesi-red-hat',
        },
      ],
    },
    {
      month: 'April 2026',
      title: 'Google Cloud Next 2026',
      location: 'Las Vegas, NV',
      dateText: 'April 22–24, 2026',
      cost: 'Paid',
      href: 'https://www.googlecloudevents.com/next-vegas/',
      sessions: [
        {
          title: 'Achieve state-of-the-art inference: High performance on TPUs and GPUs with llm-d',
          date: 'Apr 22–24, 2026',
          time: 'TBA',
          location: 'TBA',
          speakers: 'Sean Horgan (Google Cloud), Greg Pereira (Red Hat), Alex Zakonov (Google Cloud)',
          href: 'https://www.googlecloudevents.com/next-vegas/session/3912927/achieve-state-of-the-art-inference-high-performance-on-tpus-and-gpus-with-llm-d',
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
                                {s.date} · {s.time} · 📍 {s.location}
                              </div>
                              {s.speakers && (
                                <div style={{fontSize: '12px', marginTop: '2px', color: 'var(--ifm-color-emphasis-700)'}}>
                                  🎤 {s.speakers}
                                </div>
                              )}
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
