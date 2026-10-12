package shop

type Ledger struct {
	entries []string
}

func (l *Ledger) Record(entry string) {
	l.entries = append(l.entries, entry)
}

func (l *Ledger) Entries() []string {
	return l.entries
}
