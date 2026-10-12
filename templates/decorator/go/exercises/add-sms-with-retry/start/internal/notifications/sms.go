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

func (s *Sms) Notify(recipient, message string) error {
	return nil
}

func NewSmsNotifier(services SmsServices) Notifier {
	return &Sms{gateway: services.Sms}
}
