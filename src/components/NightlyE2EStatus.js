import React, { useState, useEffect } from 'react';

const API_URL = 'https://console.kubestellar.io/api/public/nightly-e2e/runs';
const POLL_INTERVAL = 300000; // 5 minutes

const PLATFORMS = ['OCP', 'GKE', 'CKS'];
const PLATFORM_COLORS = { OCP: '#f97316', GKE: '#3b82f6', CKS: '#a855f7' };
const CONCLUSION_COLORS = { success: '#22c55e', failure: '#ef4444', cancelled: '#6b7280', skipped: '#6b7280' };

function timeAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - new Date(ts).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return Math.floor(ms / 60000) + 'm ago';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default function NightlyE2EStatus({ styles }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusHeader}>
          <span className={`${styles.statusDot} ${styles.statusInfo}`} />
          <span className={styles.statusTitle}>Nightly E2E Status</span>
        </div>
        <p className={styles.loadingText}>Loading status data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.statusCard}>
        <div className={styles.statusHeader}>
          <span className={`${styles.statusDot} ${styles.statusError}`} />
          <span className={styles.statusTitle}>Nightly E2E Status</span>
        </div>
        <div className={styles.offlineMessage}>
          <p className={styles.offlineTitle}>Unable to load E2E status</p>
          <p className={styles.offlineDetail}>
            Could not connect to the status API. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const guides = data?.guides || [];
  const totalGuides = guides.length;
  const failing = guides.filter(g => g.latestConclusion === 'failure').length;
  const allRuns = guides.flatMap(g => g.runs || []);
  const completedRuns = allRuns.filter(r => r.status === 'completed');
  const passedRuns = completedRuns.filter(r => r.conclusion === 'success');
  const passRate = completedRuns.length > 0
    ? Math.round((passedRuns.length / completedRuns.length) * 100)
    : 0;

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusHeader}>
        <span
          className={styles.statusDot}
          style={{ backgroundColor: failing > 0 ? '#ef4444' : '#22c55e' }}
        />
        <span className={styles.statusTitle}>Nightly E2E Status</span>
        {data?.cachedAt && (
          <span className={styles.lastUpdated}>
            Updated {timeAgo(data.cachedAt)}
          </span>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statValue} style={{ color: '#a855f7' }}>{passRate}%</div>
          <div className={styles.statLabel}>Pass Rate</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{totalGuides}</div>
          <div className={styles.statLabel}>Guides</div>
        </div>
        <div className={styles.stat}>
          <div
            className={styles.statValue}
            style={{ color: failing > 0 ? '#ef4444' : '#22c55e' }}
          >
            {failing}
          </div>
          <div className={styles.statLabel}>Failing</div>
        </div>
      </div>

      {PLATFORMS.map(platform => {
        const platGuides = guides.filter(g => g.platform === platform);
        if (platGuides.length === 0) return null;
        return (
          <div key={platform} className={styles.platformSection}>
            <div
              className={styles.platformName}
              style={{ color: PLATFORM_COLORS[platform] }}
            >
              {platform}
            </div>
            {platGuides.map(g => {
              const runs = (g.runs || []).slice(0, 7);
              const failedAll = runs.filter(r => r.status === 'completed' && r.conclusion === 'failure');
              const gpuFails = failedAll.filter(r => r.failureReason === 'gpu_unavailable').length;
              const workflowUrl = `https://github.com/${g.repo}/actions/workflows/${g.workflowFile}`;

              return (
                <div key={g.guide + g.platform} className={styles.guideRow}>
                  <a
                    href={workflowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.guideAcronym}
                    title={`${g.guide} — View workflow`}
                  >
                    {g.acronym}
                  </a>
                  <div className={styles.guideNameWrap}>
                    <span className={styles.guideName}>{g.guide}</span>
                    <span className={styles.guideDetail}>
                      {g.model}{g.gpuType && g.gpuType !== 'CPU' ? ` · ${g.gpuCount}× ${g.gpuType}` : ''}
                    </span>
                  </div>
                  <div className={styles.runDots}>
                    {runs.map((run, i) => {
                      const isGpu = run.conclusion === 'failure' && run.failureReason === 'gpu_unavailable';
                      const dotColor = run.status !== 'completed'
                        ? '#60a5fa'
                        : isGpu ? '#f59e0b'
                        : (CONCLUSION_COLORS[run.conclusion] || '#6b7280');
                      const label = (run.conclusion || run.status) + (isGpu ? ' (GPU unavailable)' : '');

                      return (
                        <a
                          key={i}
                          href={run.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.runDotLink}
                          title={`${label} — ${timeAgo(run.updatedAt || run.createdAt)}`}
                        >
                          <span
                            className={`${styles.runDot} ${run.status !== 'completed' ? styles.runDotPulse : ''}`}
                            style={{ backgroundColor: dotColor }}
                          />
                        </a>
                      );
                    })}
                    {runs.length === 0 && (
                      <span className={styles.noRuns}>no runs</span>
                    )}
                  </div>
                  <div className={styles.guideStats}>
                    {gpuFails > 0 && (
                      <span className={styles.gpuBadge} title="GPU unavailable failures">
                        GPU: {gpuFails}
                      </span>
                    )}
                    <span className={styles.guidePassRate} style={{
                      color: g.passRate >= 80 ? '#22c55e' : g.passRate >= 50 ? '#eab308' : '#ef4444',
                    }}>
                      {g.passRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#22c55e' }} /> Pass
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#ef4444' }} /> Fail
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }} /> GPU unavailable
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#60a5fa' }} /> In progress
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#6b7280' }} /> Cancelled
        </span>
      </div>
    </div>
  );
}
