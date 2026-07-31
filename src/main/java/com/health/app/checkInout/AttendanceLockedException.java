package com.health.app.checkInout;

public class AttendanceLockedException extends RuntimeException {

	public AttendanceLockedException(String message) {
		super(message);
	}
}
