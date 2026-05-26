// gemini — minimal client for cloudflare ai gateway → google ai studio gemini

package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	apiKey     string
	gatewayURL string
	http       *http.Client
}

func New(apiKey, gatewayURL string) *Client {
	if apiKey == "" || gatewayURL == "" {
		return nil
	}
	return &Client{
		apiKey:     apiKey,
		gatewayURL: gatewayURL,
		http:       &http.Client{Timeout: 30 * time.Second},
	}
}

type part struct {
	Text string `json:"text"`
}

type content struct {
	Parts []part `json:"parts"`
}

type request struct {
	Contents []content `json:"contents"`
}

type response struct {
	Candidates []struct {
		Content content `json:"content"`
	} `json:"candidates"`
}

func (c *Client) Generate(ctx context.Context, prompt string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("gemini: not configured")
	}
	body, err := json.Marshal(request{Contents: []content{{Parts: []part{{Text: prompt}}}}})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", c.gatewayURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/json")
	req.Header.Set("x-goog-api-key", c.apiKey)
	res, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return "", fmt.Errorf("gemini: status %d", res.StatusCode)
	}
	var out response
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return "", err
	}
	if len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty response")
	}
	return out.Candidates[0].Content.Parts[0].Text, nil
}
