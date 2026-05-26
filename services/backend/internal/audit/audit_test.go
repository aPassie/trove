package audit

import (
	"regexp"
	"testing"
	"time"

	"github.com/aPassie/trove/backend/internal/redact"
	"github.com/aPassie/trove/backend/internal/storage"
	"github.com/pashagolub/pgxmock/v4"
)

func TestRecord_NilStore_NoOp(t *testing.T) {
	a := New(nil, redact.New())
	if err := a.Record(Entry{Actor: "agent", Action: "analyse"}); err != nil {
		t.Errorf("expected nil error with nil store, got %v", err)
	}
}

func TestRecord_InsertsRedactedPayload(t *testing.T) {
	pool, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	pool.ExpectExec(regexp.QuoteMeta(`insert into audit_entries`)).
		WithArgs("agent", "analyse", "ABCDE1234F", pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnResult(pgxmock.NewResult("INSERT", 1))

	a := New(storage.NewStore(pool), redact.New())
	err = a.Record(Entry{
		Actor:     "agent",
		Action:    "analyse",
		Target:    "ABCDE1234F",
		Payload:   map[string]any{"pan": "ABCDE1234F"},
		Timestamp: time.Now(),
	})
	if err != nil {
		t.Fatalf("record: %v", err)
	}
	if err := pool.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestRecord_PropagatesStoreError(t *testing.T) {
	pool, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	pool.ExpectExec(regexp.QuoteMeta(`insert into audit_entries`)).
		WillReturnError(errExpected)

	a := New(storage.NewStore(pool), redact.New())
	err = a.Record(Entry{Actor: "agent", Action: "analyse", Payload: map[string]any{}})
	if err == nil {
		t.Fatal("expected error from store")
	}
}

var errExpected = &mockErr{msg: "boom"}

type mockErr struct{ msg string }

func (e *mockErr) Error() string { return e.msg }
