package storage

import (
	"regexp"
	"testing"
	"time"

	"github.com/pashagolub/pgxmock/v4"
)

func TestInsertAudit_BuildsExpectedSQL(t *testing.T) {
	pool, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	ts := time.Date(2026, 5, 19, 10, 0, 0, 0, time.UTC)
	pool.ExpectExec(regexp.QuoteMeta(`insert into audit_entries (actor, action, target, payload, occurred_at) values ($1, $2, $3, $4, $5)`)).
		WithArgs("agent", "analyse", "ZZZZZ9999Z", []byte(`{"k":"v"}`), ts).
		WillReturnResult(pgxmock.NewResult("INSERT", 1))

	store := NewStore(pool)
	if err := store.InsertAudit("agent", "analyse", "ZZZZZ9999Z", []byte(`{"k":"v"}`), ts); err != nil {
		t.Fatalf("insert: %v", err)
	}
	if err := pool.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestInsertAudit_PropagatesError(t *testing.T) {
	pool, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	pool.ExpectExec("insert into audit_entries").
		WithArgs(pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg(), pgxmock.AnyArg()).
		WillReturnError(&mockErr{msg: "connection refused"})

	store := NewStore(pool)
	err = store.InsertAudit("a", "b", "c", nil, time.Now())
	if err == nil || err.Error() != "connection refused" {
		t.Errorf("expected connection refused, got %v", err)
	}
}

type mockErr struct{ msg string }

func (e *mockErr) Error() string { return e.msg }
