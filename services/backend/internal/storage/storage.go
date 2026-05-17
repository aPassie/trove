// storage — postgres on neon, append-only audit log writes

package storage

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pg *pgxpool.Pool
}

func MustOpen(dsn string) *Store {
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("storage: %v", err)
	}
	return &Store{pg: pool}
}

func (s *Store) InsertAudit(actor, action, target string, payload []byte, ts time.Time) error {
	_, err := s.pg.Exec(context.Background(),
		`insert into audit_entries (actor, action, target, payload, occurred_at) values ($1, $2, $3, $4, $5)`,
		actor, action, target, payload, ts)
	return err
}
