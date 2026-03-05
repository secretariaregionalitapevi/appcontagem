import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { theme } from '../theme';

interface AnimatedSplashScreenProps {
    onAnimationComplete?: () => void;
}

const { width } = Dimensions.get('window');

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
    onAnimationComplete
}) => {
    // Valores de animação
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Sequência de Animação de Entrada
        Animated.parallel([
            // Fade In Suave
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            // Efeito de "Respiração" / Escala (Zoom in suave)
            Animated.timing(scaleAnim, {
                toValue: 1.05,
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(1.5)),
            })
        ]).start(() => {
            // Após a entrada, inicia um leve efeito de pulso contínuo (Heartbeat)
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    })
                ])
            ).start();
        });

        // Cleanup opcional
        return () => {
            scaleAnim.stopAnimation();
            opacityAnim.stopAnimation();
        };
    }, [scaleAnim, opacityAnim]);

    return (
        <View style={styles.container}>
            <Animated.Image
                source={require('../../assets/icon.png')}
                style={[
                    styles.logo,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary, // Fundo escuro elegante (Azul Marinho)
    },
    logo: {
        width: width * 0.5, // 50% da largura da tela
        maxWidth: 200,
        height: width * 0.5,
        maxHeight: 200,
    },
});
