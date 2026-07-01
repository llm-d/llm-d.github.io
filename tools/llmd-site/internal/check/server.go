package check

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

// Server runs docusaurus serve for HTTP-based checks.
type Server struct {
	cmd    *exec.Cmd
	port   int
	host   string
	root   string
	ready  chan struct{}
	err    error
	stdout io.ReadCloser
}

func StartServer(repoRoot string, cfg Config) (*Server, error) {
	s := &Server{
		port:  cfg.ServerPort,
		host:  cfg.ServerHost,
		root:  repoRoot,
		ready: make(chan struct{}),
	}

	cmd := exec.Command("npx", "docusaurus", "serve",
		"--port", itoa(cfg.ServerPort),
		"--no-open",
	)
	cmd.Dir = repoRoot
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	s.stdout = stdout
	s.cmd = cmd

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start docusaurus serve: %w", err)
	}

	go s.scanOutput(stdout, false)
	go s.scanOutput(stderr, true)

	select {
	case <-s.ready:
		time.Sleep(time.Second)
		return s, nil
	case <-time.After(30 * time.Second):
		_ = s.Stop()
		return nil, fmt.Errorf("server start timeout")
	}
}

func (s *Server) scanOutput(r io.Reader, isErr bool) {
	scanner := bufio.NewScanner(r)
	var buf []string
	for scanner.Scan() {
		line := scanner.Text()
		buf = append(buf, line)
		if len(buf) > 50 {
			buf = buf[1:]
		}
		joined := ""
		for _, l := range buf {
			joined += l
		}
		if serverReady(joined) {
			select {
			case <-s.ready:
			default:
				close(s.ready)
			}
		}
		if isErr && !strings.Contains(line, "[WARNING]") && !strings.Contains(line, "DeprecationWarning") {
			fmt.Fprintln(os.Stderr, "Server:", line)
		}
	}
}

func serverReady(s string) bool {
	return strings.Contains(s, "Serving") || strings.Contains(s, "localhost:")
}

func (s *Server) Stop() error {
	if s.cmd == nil || s.cmd.Process == nil {
		return nil
	}
	fmt.Println("\n🛑 Stopping server...")
	pgid, err := syscall.Getpgid(s.cmd.Process.Pid)
	if err == nil {
		_ = syscall.Kill(-pgid, syscall.SIGKILL)
	}
	_ = s.cmd.Process.Kill()
	_, _ = s.cmd.Process.Wait()
	return nil
}

func (s *Server) BaseURL() string {
	return "http://" + s.host + ":" + itoa(s.port)
}
