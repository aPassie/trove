// audit — append-only log of every agent action, routes payloads through redact first

package audit

import (
	"encoding/json"
	"time"

	"github.com/aPassie/trove/backend/internal/redact"
	"github.com/aPassie/trove/backend/internal/storage"
)

type Auditor struct {
	store    *storage.Store
	redactor *redact.Redactor
}

func New(store *storage.Store, redactor *redact.Redactor) *Auditor {
	return &Auditor{store: store, redactor: redactor}
}

type Entry struct {
	Actor     string
	Action    string
	Target    string
	Payload   any
	Timestamp time.Time
}

func (a *Auditor) Record(e Entry) error {
	cleaned, err := a.redactor.Redact(e.Payload)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(cleaned)
	if err != nil {
		return err
	}
	return a.store.InsertAudit(e.Actor, e.Action, e.Target, payload, e.Timestamp)
}
