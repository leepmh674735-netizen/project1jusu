package com.health.app.payment;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDeleteResult {

	private boolean deleted; // 👈 daleted 오타 수정! (isDeleted() 자동 생성)
	private boolean alreadyPaidWarning;

}