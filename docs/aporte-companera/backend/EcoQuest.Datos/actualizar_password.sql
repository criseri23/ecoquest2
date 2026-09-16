CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) NOT NULL,
    `ProductVersion` varchar(32) NOT NULL,
    PRIMARY KEY (`MigrationId`)
);

START TRANSACTION;
CREATE TABLE `Insignias` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Nombre` longtext NOT NULL,
    `Descripcion` longtext NOT NULL,
    PRIMARY KEY (`Id`)
);

CREATE TABLE `Misiones` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Titulo` longtext NOT NULL,
    `Descripcion` longtext NOT NULL,
    `Experiencia` int NOT NULL,
    `Completada` tinyint(1) NOT NULL,
    PRIMARY KEY (`Id`)
);

CREATE TABLE `Recompensas` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Nombre` longtext NOT NULL,
    `Costo` int NOT NULL,
    PRIMARY KEY (`Id`)
);

CREATE TABLE `Residuos` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Nombre` longtext NOT NULL,
    `Tipo` longtext NOT NULL,
    `Puntos` int NOT NULL,
    PRIMARY KEY (`Id`)
);

CREATE TABLE `Usuarios` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Nombre` longtext NOT NULL,
    `Email` longtext NOT NULL,
    `Contraseña` longtext NOT NULL,
    `Nivel` int NOT NULL,
    `Experiencia` int NOT NULL,
    `Monedas` int NOT NULL,
    PRIMARY KEY (`Id`)
);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260913024934_InicialMySQL', '10.0.10');

ALTER TABLE `Usuarios` CHANGE `Contraseña` `PasswordHash` longtext NOT NULL DEFAULT '';

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260913031014_CambiarContraseñaPorPasswordHash', '10.0.10');

COMMIT;

