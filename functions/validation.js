'use strict';

exports.username = function (str) {
	return (!str || str == '' || str.length < 4 || typeof str !== 'string' || / /g.test(str) || str.length > 20)
		? false
		: true;
};

exports.phone = function (str) {
	return (!str || str == '' || str.length < 10 || (str && typeof str !== 'string'))
        ? false
        : true;
};

exports.password = function (str) {
	return (!str || str == '' || str.length < 6 || (str && typeof str !== 'string') || / /g.test(str) || str.length > 20)
        ? false
        : true;
};

exports.name = function (str) {

	return (!str || str == '' || str.length < 6 || (str && typeof str !== 'string') || !/^[a-z ,.'-]+$/i.test(str) )
        ? false
        : true;
};