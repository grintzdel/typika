package notifications

type SmsGateway interface {
	SendSms(phoneNumber, text string) error
}

type SmsServices struct {
	Sms    SmsGateway
	Logger Logger
}

type Sms struct {
	gateway SmsGateway
}

func NewSms(gateway SmsGateway) *Sms {
	return &Sms{gateway: gateway}
}

func (s *Sms) Notify(recipient, message string) error {
	return s.gateway.SendSms(recipient, message)
}

func NewSmsNotifier(services SmsServices) Notifier {
	sending := NewSms(services.Sms)
	retrying := NewRetrying(sending, maxAttempts)
	return NewLogging(retrying, services.Logger)
}
