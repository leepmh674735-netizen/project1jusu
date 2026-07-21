package com.health.app.payment;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PaymentDeleteResult {
	
	private boolean daleted;
	private boolean alreadyPaidWarning;

}
